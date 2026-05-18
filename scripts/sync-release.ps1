<#
.SYNOPSIS
    Release sync helper for version drift, bump inference, and changelog checks.

.DESCRIPTION
    Default mode is dry-run. The script inspects declared version targets,
    compares them with the latest git tag, infers a semver bump from
    conventional commits, cross-checks CHANGELOG coverage, and optionally
    applies the new version to package.json, package-lock.json, and CHANGELOG.md.

.PARAMETER Apply
    Write changes to disk. Default behavior is dry-run.

.PARAMETER DryRun
    Explicit dry-run mode. Kept for compatibility; dry-run is already the default.

.PARAMETER Bump
    Override inferred bump type. Accepted values: patch, minor, major.

.PARAMETER Audit
    Scan the repository for undeclared occurrences of the current version string.

.PARAMETER ConfigPath
    Optional version-target config file. Supports a `.version-bump.json`-style
    `files` array and optional `audit.exclude` list.

.NOTES
    PowerShell 5.1+ compatible.
    Exit codes:
      0 = clean dry-run or successful apply
      1 = dry-run found drift, gaps, or pending release work
      2 = apply blocked because latest git tag is ahead of declared file versions
      3 = runtime error
#>

[CmdletBinding()]
param(
    [switch]$Apply,

    [switch]$DryRun,

    [ValidateSet('patch', 'minor', 'major')]
    [string]$Bump,

    [switch]$Audit,

    [string]$ConfigPath = '.version-bump.json'
)

Set-StrictMode -Version 2
$ErrorActionPreference = 'Stop'

$ExitSuccess = 0
$ExitNeedsAttention = 1
$ExitApplyBlocked = 2
$ExitRuntimeError = 3

$script:RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$script:IsApply = $Apply.IsPresent
$script:JsonCache = @{}
$script:Utf8NoBom = New-Object System.Text.UTF8Encoding($false)
$script:Today = Get-Date -Format 'yyyy-MM-dd'

function Write-Section {
    param([string]$Message)
    Write-Host ''
    Write-Host ('=== {0} ===' -f $Message) -ForegroundColor Cyan
}

function Write-Info {
    param([string]$Message)
    Write-Host ('[INFO] {0}' -f $Message) -ForegroundColor Gray
}

function Write-Warn {
    param([string]$Message)
    Write-Host ('[WARN] {0}' -f $Message) -ForegroundColor Yellow
}

function Write-ErrorLine {
    param([string]$Message)
    Write-Host ('[ERROR] {0}' -f $Message) -ForegroundColor Red
}

function Write-Action {
    param([string]$Message)
    $prefix = if ($script:IsApply) { '[APPLY]' } else { '[DRY-RUN]' }
    Write-Host ('{0} {1}' -f $prefix, $Message) -ForegroundColor Magenta
}

function Write-Ok {
    param([string]$Message)
    Write-Host ('[OK] {0}' -f $Message) -ForegroundColor Green
}

function Split-Lines {
    param([string]$Text)
    if ([string]::IsNullOrWhiteSpace($Text)) {
        return @()
    }

    return @($Text -split "`r?`n")
}

function ConvertTo-Array {
    param($Value)
    if ($null -eq $Value) {
        return @()
    }

    if ($Value -is [System.Array]) {
        return @($Value)
    }

    return @($Value)
}

function Test-SemVer {
    param([string]$Version)
    return $Version -match '^\d+\.\d+\.\d+$'
}

function Compare-SemVer {
    param(
        [string]$A,
        [string]$B
    )

    if (-not (Test-SemVer $A)) { throw "Invalid semver: $A" }
    if (-not (Test-SemVer $B)) { throw "Invalid semver: $B" }

    $aParts = $A.Split('.')
    $bParts = $B.Split('.')

    for ($i = 0; $i -lt 3; $i++) {
        $aPart = [int]$aParts[$i]
        $bPart = [int]$bParts[$i]
        if ($aPart -gt $bPart) { return 1 }
        if ($aPart -lt $bPart) { return -1 }
    }

    return 0
}

function Get-BumpedVersion {
    param(
        [string]$Current,
        [string]$BumpType
    )

    $parts = $Current.Split('.')
    $major = [int]$parts[0]
    $minor = [int]$parts[1]
    $patch = [int]$parts[2]

    switch ($BumpType) {
        'major' { return ('{0}.0.0' -f ($major + 1)) }
        'minor' { return ('{0}.{1}.0' -f $major, ($minor + 1)) }
        'patch' { return ('{0}.{1}.{2}' -f $major, $minor, ($patch + 1)) }
        default { throw "Unsupported bump type: $BumpType" }
    }
}

function Get-JsonDocument {
    param([string]$RelativePath)

    if (-not $script:JsonCache.ContainsKey($RelativePath)) {
        $fullPath = Join-Path $script:RepoRoot $RelativePath
        if (-not (Test-Path $fullPath)) {
            throw "Missing JSON file: $RelativePath"
        }

        $raw = [System.IO.File]::ReadAllText($fullPath)
        $obj = $raw | ConvertFrom-Json
        $script:JsonCache[$RelativePath] = [PSCustomObject]@{
            Path = $fullPath
            Raw  = $raw
            Json = $obj
        }
    }

    return $script:JsonCache[$RelativePath]
}

function Get-FileText {
    param([string]$RelativePath)

    $fullPath = Join-Path $script:RepoRoot $RelativePath
    if (-not (Test-Path $fullPath)) {
        throw "Missing file: $RelativePath"
    }

    return [System.IO.File]::ReadAllText($fullPath)
}

function Write-JsonDocument {
    param(
        [string]$RelativePath,
        $JsonObject
    )

    $fullPath = Join-Path $script:RepoRoot $RelativePath
    $jsonText = $JsonObject | ConvertTo-Json -Depth 100
    [System.IO.File]::WriteAllText($fullPath, $jsonText + [Environment]::NewLine, $script:Utf8NoBom)
    $script:JsonCache.Remove($RelativePath) | Out-Null
}

function Get-PackageLockTopLevelVersion {
    param([string]$Text)

    $match = [regex]::Match($Text, '(?m)^\s*"version"\s*:\s*"(?<version>[^"]+)"\s*,')
    if (-not $match.Success) {
        return $null
    }

    return $match.Groups['version'].Value
}

function Get-PackageLockRootVersion {
    param([string]$Text)

    $match = [regex]::Match($Text, '(?s)"packages"\s*:\s*\{\s*""\s*:\s*\{.*?"version"\s*:\s*"(?<version>[^"]+)"')
    if (-not $match.Success) {
        return $null
    }

    return $match.Groups['version'].Value
}

function Set-PackageLockVersionFields {
    param(
        [string]$Text,
        [string]$NewVersion
    )

    $updated = $Text

    $topLevelMatch = [regex]::Match($updated, '(?m)^\s*"version"\s*:\s*"(?<version>[^"]+)"\s*,')
    if (-not $topLevelMatch.Success) {
        throw 'Could not locate top-level package-lock.json version field.'
    }
    $updated = $updated.Substring(0, $topLevelMatch.Groups['version'].Index) + $NewVersion + $updated.Substring($topLevelMatch.Groups['version'].Index + $topLevelMatch.Groups['version'].Length)

    $rootMatch = [regex]::Match($updated, '(?s)"packages"\s*:\s*\{\s*""\s*:\s*\{.*?"version"\s*:\s*"(?<version>[^"]+)"')
    if (-not $rootMatch.Success) {
        throw 'Could not locate package-lock.json packages[""].version field.'
    }
    $updated = $updated.Substring(0, $rootMatch.Groups['version'].Index) + $NewVersion + $updated.Substring($rootMatch.Groups['version'].Index + $rootMatch.Groups['version'].Length)

    return $updated
}

function Get-ConfigData {
    param([string]$RelativeConfigPath)

    $defaultTargets = @(
        [PSCustomObject]@{ Path = 'package.json'; Kind = 'jsonField'; Field = 'version'; Label = 'package.json (version)' },
        [PSCustomObject]@{ Path = 'package-lock.json'; Kind = 'packageLockTopLevelVersion'; Field = $null; Label = 'package-lock.json (version)' },
        [PSCustomObject]@{ Path = 'package-lock.json'; Kind = 'packageLockRootVersion'; Field = $null; Label = 'package-lock.json (packages[""].version)' }
    )

    $defaultAuditExclude = @('.git', 'node_modules')
    $configFullPath = Join-Path $script:RepoRoot $RelativeConfigPath

    if (-not (Test-Path $configFullPath)) {
        return [PSCustomObject]@{
            Source       = '(defaults)'
            Targets      = $defaultTargets
            AuditExclude = $defaultAuditExclude
        }
    }

    $config = ([System.IO.File]::ReadAllText($configFullPath)) | ConvertFrom-Json
    $targets = @()

    if ($config.PSObject.Properties.Name -contains 'targets') {
        foreach ($target in (ConvertTo-Array $config.targets)) {
            $targets += [PSCustomObject]@{
                Path  = [string]$target.path
                Kind  = [string]$target.kind
                Field = [string]$target.field
                Label = if ($target.label) { [string]$target.label } else { [string]$target.path }
            }
        }
    }
    elseif ($config.PSObject.Properties.Name -contains 'files') {
        foreach ($target in (ConvertTo-Array $config.files)) {
            $field = [string]$target.field
            $kind = 'jsonField'
            if ([string]$target.path -eq 'package-lock.json' -and $field -eq 'version') {
                $kind = 'packageLockTopLevelVersion'
            }
            $label = '{0} ({1})' -f $target.path, $field

            $targets += [PSCustomObject]@{
                Path  = [string]$target.path
                Kind  = $kind
                Field = $field
                Label = $label
            }
        }
    }

    if ($targets.Count -eq 0) {
        $targets = $defaultTargets
    }

    $auditExclude = @()
    if ($config.PSObject.Properties.Name -contains 'audit' -and $config.audit -and $config.audit.PSObject.Properties.Name -contains 'exclude') {
        $auditExclude = ConvertTo-Array $config.audit.exclude
    }
    if ($auditExclude.Count -eq 0) {
        $auditExclude = $defaultAuditExclude
    }

    return [PSCustomObject]@{
        Source       = $RelativeConfigPath
        Targets      = $targets
        AuditExclude = $auditExclude
    }
}

function Get-TargetVersion {
    param($Target)

    $fullPath = Join-Path $script:RepoRoot $Target.Path
    if (-not (Test-Path $fullPath)) {
        return $null
    }

    switch ($Target.Kind) {
        'jsonField' {
            $doc = Get-JsonDocument $Target.Path
            return [string]$doc.Json.($Target.Field)
        }
        'packageLockTopLevelVersion' {
            $text = Get-FileText $Target.Path
            return Get-PackageLockTopLevelVersion -Text $text
        }
        'packageLockRootVersion' {
            $text = Get-FileText $Target.Path
            return Get-PackageLockRootVersion -Text $text
        }
        default {
            throw "Unsupported target kind: $($Target.Kind)"
        }
    }
}

function Get-VersionInventory {
    param([System.Collections.IEnumerable]$Targets)

    $records = @()
    foreach ($target in $Targets) {
        $version = Get-TargetVersion $target
        $records += [PSCustomObject]@{
            Path    = $target.Path
            Label   = $target.Label
            Kind    = $target.Kind
            Version = $version
            Missing = [string]::IsNullOrWhiteSpace($version)
        }
    }

    return ,$records
}

function Get-LatestTagVersion {
    $tagLines = @(git tag --list 'v*' --sort=-version:refname 2>$null)
    if ($LASTEXITCODE -ne 0) {
        throw 'git tag failed'
    }

    foreach ($tag in $tagLines) {
        $trimmed = [string]$tag
        if ($trimmed -match '^v(\d+\.\d+\.\d+)$') {
            return [PSCustomObject]@{ Tag = $trimmed; Version = $matches[1] }
        }
    }

    return $null
}

function Get-CommitRecords {
    param([string]$Range)

    $args = @('log')
    if ($Range) {
        $args += $Range
    }
    $args += '--format=%H%x1f%s%x1f%b%x1e'

    $output = & git @args 2>$null
    if ($LASTEXITCODE -ne 0) {
        throw 'git log failed'
    }

    $raw = [string]::Join([Environment]::NewLine, (ConvertTo-Array $output))
    if ([string]::IsNullOrWhiteSpace($raw)) {
        return @()
    }

    $records = @()
    $entries = $raw -split [char]30
    foreach ($entry in $entries) {
        if ([string]::IsNullOrWhiteSpace($entry)) {
            continue
        }

        $parts = $entry -split [char]31, 3
        $hash = if ($parts.Length -ge 1) { $parts[0].Trim() } else { '' }
        $subject = if ($parts.Length -ge 2) { $parts[1].Trim() } else { '' }
        $body = if ($parts.Length -ge 3) { $parts[2].Trim() } else { '' }

        if ([string]::IsNullOrWhiteSpace($hash) -or [string]::IsNullOrWhiteSpace($subject)) {
            continue
        }

        $records += [PSCustomObject]@{
            Hash      = $hash
            ShortHash = $hash.Substring(0, [Math]::Min(7, $hash.Length))
            Subject   = $subject
            Body      = $body
        }
    }

    return ,$records
}

function Get-BumpFromCommits {
    param([System.Collections.IEnumerable]$Commits)

    $hasMajor = $false
    $hasMinor = $false
    $hasPatch = $false

    foreach ($commit in $Commits) {
        $subject = [string]$commit.Subject
        $body = [string]$commit.Body
        if ($subject -match '^[a-z]+(\([^)]+\))?!:' -or $body -match 'BREAKING CHANGE:') {
            $hasMajor = $true
            continue
        }

        if ($subject -match '^feat(\([^)]+\))?:') {
            $hasMinor = $true
            continue
        }

        if ($subject -match '^(fix|perf|refactor|revert)(\([^)]+\))?:') {
            $hasPatch = $true
            continue
        }
    }

    if ($hasMajor) { return 'major' }
    if ($hasMinor) { return 'minor' }
    if ($hasPatch) { return 'patch' }
    return $null
}

function Get-ChangelogBucket {
    param([string]$Subject, [string]$Body)

    if ($Subject -match '^[a-z]+(\([^)]+\))?!:' -or $Body -match 'BREAKING CHANGE:') {
        return 'Changed'
    }

    if ($Subject -match '^feat(\([^)]+\))?:') { return 'Added' }
    if ($Subject -match '^fix(\([^)]+\))?:') { return 'Fixed' }
    if ($Subject -match '^security(\([^)]+\))?:') { return 'Security' }
    if ($Subject -match '^test(\([^)]+\))?:') { return 'Tests' }
    if ($Subject -match '^(perf|refactor)(\([^)]+\))?:') { return 'Changed' }
    if ($Subject -match '^docs(\([^)]+\))?:') { return 'Changed' }
    if ($Subject -match '^remove(\([^)]+\))?:') { return 'Removed' }

    return 'Uncategorized'
}

function Get-ChangelogBullet {
    param([string]$Subject)

    $clean = $Subject -replace '^[a-z]+(\([^)]+\))?!:\s*', ''
    return $clean.Trim()
}

function Get-ChangelogSections {
    param([string]$Content)

    $lines = Split-Lines $Content
    $sections = @()
    $current = $null

    for ($i = 0; $i -lt $lines.Count; $i++) {
        $line = $lines[$i]
        if ($line -match '^##\s+\[(\d+\.\d+\.\d+)\]\s*-\s*(\d{4}-\d{2}-\d{2})') {
            if ($null -ne $current) {
                $current.EndIndex = $i - 1
                $current.Text = ($lines[$current.StartIndex..$current.EndIndex] -join "`n")
                $sections += $current
            }

            $current = [PSCustomObject]@{
                Version    = $matches[1]
                Date       = $matches[2]
                StartIndex = $i
                EndIndex   = $lines.Count - 1
                Text       = ''
            }
        }
    }

    if ($null -ne $current) {
        $current.EndIndex = $lines.Count - 1
        $current.Text = ($lines[$current.StartIndex..$current.EndIndex] -join "`n")
        $sections += $current
    }

    return [PSCustomObject]@{
        Lines    = $lines
        Sections = $sections
    }
}

function Test-CommitCoveredBySection {
    param(
        $Commit,
        [string]$SectionText
    )

    if ([string]::IsNullOrWhiteSpace($SectionText)) {
        return $false
    }

    $needle = (Get-ChangelogBullet $Commit.Subject)
    if (-not [string]::IsNullOrWhiteSpace($needle) -and $SectionText.IndexOf($needle, [StringComparison]::OrdinalIgnoreCase) -ge 0) {
        return $true
    }

    $normalized = ($needle -replace '[^A-Za-z0-9 ]', ' ').ToLowerInvariant()
    $tokens = @($normalized -split '\s+' | Where-Object {
        $_.Length -ge 4 -and $_ -notin @('with', 'from', 'into', 'that', 'this', 'these', 'those', 'their', 'there', 'after', 'before', 'would', 'could', 'should')
    })

    if ($tokens.Count -eq 0) {
        return $false
    }

    $matches = 0
    foreach ($token in $tokens) {
        if ($SectionText.IndexOf($token, [StringComparison]::OrdinalIgnoreCase) -ge 0) {
            $matches++
        }
    }

    return $matches -ge [Math]::Min(2, $tokens.Count)
}

function Build-ChangelogSection {
    param(
        [string]$Version,
        [System.Collections.IEnumerable]$Commits,
        [string]$DateString
    )

    $orderedBuckets = @('Added', 'Changed', 'Fixed', 'Removed', 'Security', 'Tests', 'Uncategorized')
    $lines = @(
        ('## [{0}] - {1}' -f $Version, $DateString),
        ''
    )
    $grouped = @{}

    foreach ($commit in $Commits) {
        $bucket = Get-ChangelogBucket -Subject $commit.Subject -Body $commit.Body
        if (-not $grouped.ContainsKey($bucket)) {
            $grouped[$bucket] = New-Object System.Collections.ArrayList
        }
        [void]$grouped[$bucket].Add((Get-ChangelogBullet $commit.Subject))
    }

    foreach ($bucket in $orderedBuckets) {
        if (-not $grouped.ContainsKey($bucket) -or $grouped[$bucket].Count -eq 0) {
            continue
        }

        $lines += '### {0}' -f $bucket
        $lines += ''
        foreach ($entry in $grouped[$bucket]) {
            $lines += '- {0}' -f $entry
        }
        $lines += ''
    }

    if ($lines[-1] -eq '') {
        return ($lines[0..($lines.Count - 2)] -join "`n")
    }

    return ($lines -join "`n")
}

function Upsert-ChangelogSection {
    param(
        [string]$ExistingContent,
        [string]$Version,
        [string]$SectionText
    )

    $parsed = Get-ChangelogSections $ExistingContent
    $lines = $parsed.Lines
    $sections = $parsed.Sections
    $replacementLines = Split-Lines $SectionText
    $target = $sections | Where-Object { $_.Version -eq $Version } | Select-Object -First 1

    if ($target) {
        $before = @()
        if ($target.StartIndex -gt 0) {
            $before = $lines[0..($target.StartIndex - 1)]
        }

        $after = @()
        if ($target.EndIndex + 1 -le $lines.Count - 1) {
            $after = $lines[($target.EndIndex + 1)..($lines.Count - 1)]
        }

        $updatedLines = @($before + $replacementLines + $after)
        return ($updatedLines -join "`n").TrimEnd() + "`n"
    }

    $insertIndex = $lines.Count
    foreach ($section in $sections) {
        $insertIndex = $section.StartIndex
        break
    }

    if ($insertIndex -lt $lines.Count) {
        $before = @()
        if ($insertIndex -gt 0) {
            $before = $lines[0..($insertIndex - 1)]
        }
        $after = $lines[$insertIndex..($lines.Count - 1)]
        $updatedLines = @($before + @('') + $replacementLines + @('') + $after)
        return ($updatedLines -join "`n").TrimEnd() + "`n"
    }

    $prefix = $ExistingContent.TrimEnd()
    if ([string]::IsNullOrWhiteSpace($prefix)) {
        return ($SectionText.TrimEnd() + "`n")
    }

    return ($prefix + "`n`n" + $SectionText.TrimEnd() + "`n")
}

function New-ChangelogPreamble {
    return @(
        '# Changelog',
        '',
        'All notable changes to this project are documented here.',
        '',
        'The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),',
        'and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).',
        ''
    ) -join "`n"
}

function Invoke-VersionAudit {
    param(
        [string]$Version,
        [System.Collections.IEnumerable]$Targets,
        [string[]]$ExcludePatterns
    )

    Write-Section 'Audit'
    Write-Info ('Scanning repo for undeclared references to {0}' -f $Version)

    $declaredPaths = @($Targets | ForEach-Object { (Join-Path $script:RepoRoot $_.Path) })
    $skipDirs = @{}
    foreach ($pattern in $ExcludePatterns) {
        $skipDirs[$pattern] = $true
    }

    $matches = New-Object System.Collections.ArrayList
    $files = Get-ChildItem -Path $script:RepoRoot -Recurse -File | Where-Object {
        foreach ($segment in $_.FullName.Substring($script:RepoRoot.Length).TrimStart('\').Split('\')) {
            if ($skipDirs.ContainsKey($segment)) {
                return $false
            }
        }
        return $true
    }

    foreach ($file in $files) {
        if ($declaredPaths -contains $file.FullName) {
            continue
        }

        try {
            $results = Select-String -Path $file.FullName -Pattern $Version -SimpleMatch -ErrorAction Stop
            foreach ($result in $results) {
                $relativePath = $result.Path.Substring($script:RepoRoot.Length).TrimStart('\')
                [void]$matches.Add(('{0}:{1}: {2}' -f $relativePath, $result.LineNumber, $result.Line.Trim()))
            }
        }
        catch {
            continue
        }
    }

    if ($matches.Count -eq 0) {
        Write-Ok 'No undeclared version references found.'
        return @()
    }

    Write-Warn 'Undeclared version references found:'
    foreach ($match in $matches) {
        Write-Info $match
    }
    Write-Warn 'Review these files. If they are authoritative, add them to config or reconcile manually.'
    return ,$matches
}

try {
    Write-Host 'sync-release' -ForegroundColor Cyan
    Write-Host ('mode: {0}' -f $(if ($script:IsApply) { 'apply' } else { 'dry-run' })) -ForegroundColor Cyan

    $configData = Get-ConfigData -RelativeConfigPath $ConfigPath

    Write-Section 'Declared Versions'
    Write-Info ('Version target source: {0}' -f $configData.Source)
    $inventory = Get-VersionInventory -Targets $configData.Targets
    foreach ($record in $inventory) {
        if ($record.Missing) {
            Write-Warn ('{0}: missing' -f $record.Label)
        }
        else {
            Write-Info ('{0}: {1}' -f $record.Label, $record.Version)
        }
    }

    $declaredVersions = @($inventory | Where-Object { -not $_.Missing } | ForEach-Object { $_.Version })
    $hasDeclaredDrift = $false
    if ($declaredVersions.Count -gt 0) {
        $uniqueDeclaredVersions = @($declaredVersions | Sort-Object -Unique)
        if ($uniqueDeclaredVersions.Count -gt 1) {
            $hasDeclaredDrift = $true
            Write-Warn ('Declared version drift: {0}' -f ($uniqueDeclaredVersions -join ', '))
        }
        else {
            Write-Ok ('Declared versions are in sync at {0}' -f $uniqueDeclaredVersions[0])
        }
    }
    else {
        Write-Warn 'No declared versions could be read.'
        $hasDeclaredDrift = $true
    }

    $packageDoc = Get-JsonDocument 'package.json'
    $currentVersion = [string]$packageDoc.Json.version
    if (-not (Test-SemVer $currentVersion)) {
        throw "package.json version is not semver: $currentVersion"
    }

    Write-Section 'Git State'
    $tagInfo = Get-LatestTagVersion
    $lastTag = $null
    $tagVersion = $null
    if ($tagInfo) {
        $lastTag = $tagInfo.Tag
        $tagVersion = $tagInfo.Version
        Write-Info ('Latest tag: {0}' -f $lastTag)
    }
    else {
        Write-Info 'Latest tag: (none)'
    }

    $tagAheadRecords = @()
    if ($tagVersion) {
        foreach ($record in $inventory | Where-Object { -not $_.Missing }) {
            if ((Compare-SemVer $tagVersion $record.Version) -gt 0) {
                $tagAheadRecords += $record
            }
        }
    }

    if ($tagAheadRecords.Count -gt 0) {
        Write-Warn ('Latest tag {0} is ahead of declared file versions.' -f $tagVersion)
        foreach ($record in $tagAheadRecords) {
            Write-Warn ('  {0}: {1}' -f $record.Label, $record.Version)
        }
        if ($script:IsApply) {
            Write-ErrorLine 'Apply mode is blocked. Reconcile declared file versions with git tags manually first.'
            exit $ExitApplyBlocked
        }
        Write-Warn 'Dry-run only. Manual reconciliation is recommended before using -Apply.'
    }
    elseif ($tagVersion) {
        Write-Ok 'Latest tag is not ahead of declared file versions.'
    }

    $range = if ($lastTag) { '{0}..HEAD' -f $lastTag } else { $null }
    $commits = Get-CommitRecords -Range $range
    Write-Info ('Commits since release: {0}' -f $commits.Count)
    foreach ($commit in $commits) {
        Write-Info ('  {0} {1}' -f $commit.ShortHash, $commit.Subject)
    }

    Write-Section 'Bump Plan'
    if ($Bump) {
        $bumpType = $Bump
        Write-Info ('Bump override: {0}' -f $bumpType)
    }
    else {
        $bumpType = Get-BumpFromCommits -Commits $commits
        if ($bumpType) {
            Write-Info ('Inferred bump: {0}' -f $bumpType)
        }
        else {
            Write-Info 'No conventional-commit bump inferred.'
        }
    }

    $newVersion = $null
    if ($bumpType) {
        $newVersion = Get-BumpedVersion -Current $currentVersion -BumpType $bumpType
        Write-Info ('Current version: {0}' -f $currentVersion)
        Write-Info ('Next version: {0}' -f $newVersion)
    }

    Write-Section 'CHANGELOG Check'
    $changelogPath = Join-Path $script:RepoRoot 'CHANGELOG.md'
    $changelogExists = Test-Path $changelogPath
    $changelogContent = if ($changelogExists) { [System.IO.File]::ReadAllText($changelogPath) } else { $null }
    $coverageWarnings = @()

    if (-not $changelogExists) {
        Write-Warn 'CHANGELOG.md is missing.'
        $coverageWarnings += 'missing changelog'
    }
    else {
        $parsedChangelog = Get-ChangelogSections $changelogContent
        $latestSection = $parsedChangelog.Sections | Select-Object -First 1
        if ($latestSection) {
            Write-Info ('Latest changelog section: [{0}] - {1}' -f $latestSection.Version, $latestSection.Date)
            $uncoveredCommits = @()
            foreach ($commit in $commits) {
                if (-not (Test-CommitCoveredBySection -Commit $commit -SectionText $latestSection.Text)) {
                    $uncoveredCommits += $commit
                }
            }

            if ($uncoveredCommits.Count -eq 0) {
                Write-Ok 'Latest changelog section appears to cover current commits.'
            }
            else {
                Write-Warn ('Latest changelog section misses {0} commit(s).' -f $uncoveredCommits.Count)
                foreach ($commit in $uncoveredCommits) {
                    Write-Warn ('  {0} {1}' -f $commit.ShortHash, $commit.Subject)
                }
                $coverageWarnings += 'uncovered changelog entries'
            }
        }
        else {
            Write-Warn 'No versioned changelog section found.'
            $coverageWarnings += 'missing versioned changelog section'
            $uncoveredCommits = @($commits)
        }
    }

    if ($null -eq $uncoveredCommits) {
        $uncoveredCommits = @()
    }

    $auditMatches = @()
    if ($Audit -and $currentVersion) {
        $auditMatches = Invoke-VersionAudit -Version $currentVersion -Targets $configData.Targets -ExcludePatterns $configData.AuditExclude
    }

    Write-Section 'Planned Updates'
    if (-not $newVersion) {
        Write-Info 'No version bump will be applied.'
    }
    else {
        Write-Action ('package.json version {0} -> {1}' -f $currentVersion, $newVersion)
        Write-Action ('package-lock.json root version fields {0} -> {1}' -f $currentVersion, $newVersion)
        Write-Action ('CHANGELOG.md section [{0}] dated {1}' -f $newVersion, $script:Today)
    }

    if ($script:IsApply -and $newVersion) {
        Write-Section 'Apply Changes'

        $packageDoc.Json.version = $newVersion
        Write-JsonDocument -RelativePath 'package.json' -JsonObject $packageDoc.Json
        Write-Ok 'Updated package.json'

        if (Test-Path (Join-Path $script:RepoRoot 'package-lock.json')) {
            $lockText = Get-FileText 'package-lock.json'
            $updatedLockText = Set-PackageLockVersionFields -Text $lockText -NewVersion $newVersion
            [System.IO.File]::WriteAllText((Join-Path $script:RepoRoot 'package-lock.json'), $updatedLockText, $script:Utf8NoBom)
            Write-Ok 'Updated package-lock.json root version fields only'
        }
        else {
            Write-Warn 'package-lock.json missing; skipped.'
        }

        $sectionText = Build-ChangelogSection -Version $newVersion -Commits $commits -DateString $script:Today
        if ([string]::IsNullOrWhiteSpace($sectionText)) {
            $sectionText = ('## [{0}] - {1}' -f $newVersion, $script:Today) + "`n"
        }

        $updatedChangelog = if ($changelogExists) {
            Upsert-ChangelogSection -ExistingContent $changelogContent -Version $newVersion -SectionText $sectionText
        }
        else {
            (New-ChangelogPreamble) + "`n" + $sectionText.TrimEnd() + "`n"
        }

        [System.IO.File]::WriteAllText($changelogPath, $updatedChangelog, $script:Utf8NoBom)
        Write-Ok 'Updated CHANGELOG.md'
    }

    Write-Section 'Summary'
    Write-Info ('mode={0}' -f $(if ($script:IsApply) { 'apply' } else { 'dry-run' }))
    Write-Info ('currentVersion={0}' -f $currentVersion)
    Write-Info ('latestTag={0}' -f $(if ($lastTag) { $lastTag } else { '(none)' }))
    Write-Info ('bumpType={0}' -f $(if ($bumpType) { $bumpType } else { '(none)' }))
    Write-Info ('nextVersion={0}' -f $(if ($newVersion) { $newVersion } else { '(unchanged)' }))
    Write-Info ('commitCount={0}' -f $commits.Count)
    Write-Info ('changelogCoverageWarnings={0}' -f $coverageWarnings.Count)
    Write-Info ('auditMatches={0}' -f $auditMatches.Count)

    if ($script:IsApply) {
        Write-Ok 'Apply complete.'
        exit $ExitSuccess
    }

    $dryRunNeedsAttention = $false
    if ($hasDeclaredDrift) { $dryRunNeedsAttention = $true }
    if ($tagAheadRecords.Count -gt 0) { $dryRunNeedsAttention = $true }
    if ($coverageWarnings.Count -gt 0) { $dryRunNeedsAttention = $true }
    if ($newVersion) { $dryRunNeedsAttention = $true }
    if ($auditMatches.Count -gt 0) { $dryRunNeedsAttention = $true }

    if ($dryRunNeedsAttention) {
        Write-Warn 'Dry-run found work or drift that needs attention.'
        exit $ExitNeedsAttention
    }

    Write-Ok 'Dry-run found no pending release work.'
    exit $ExitSuccess
}
catch {
    Write-ErrorLine $_.Exception.Message
    if ($_.InvocationInfo -and $_.InvocationInfo.PositionMessage) {
        Write-ErrorLine $_.InvocationInfo.PositionMessage
    }
    exit $ExitRuntimeError
}
