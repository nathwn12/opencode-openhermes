<#
.SYNOPSIS
    Quick-win diagnostic for openhermes-pkg — AI-orchestrator-facing.
.DESCRIPTION
    Outputs JSON-Lines diagnostics consumable by the OpenHermes orchestrator.
    Each line is a check result; final line is the summary verdict.
.PARAMETER SkipOCChecks
    Skip opencode CLI checks (useful when opencode isn't running).
.EXAMPLE
    .\oh-doctor.ps1
    .\oh-doctor.ps1 -SkipOCChecks
#>

param(
    [switch]$SkipOCChecks
)

$PackageRoot = Resolve-Path "$PSScriptRoot\.."
$ErrorActionPreference = "Continue"
$script:checks = @()
$script:checks = @()

function Write-Check {
    param(
        [Parameter(Mandatory)] [string]$Id,
        [Parameter(Mandatory)] [string]$Name,
        [Parameter(Mandatory)] [ValidateSet("PASS","WARN","FAIL","SKIP")] [string]$Status,
        [string]$Detail = "",
        [hashtable]$Evidence = @{},
        [string]$Severity = "medium",
        [hashtable]$Fix = @{}
    )
    $result = @{
        id       = $Id
        name     = $Name
        status   = $Status
        severity = $Severity
        detail   = $Detail
        evidence = $Evidence
        fix      = $Fix
    }
    $script:checks += $result
    $result | ConvertTo-Json -Compress -Depth 5
}

# ============================================================
# CHECK 1: AGENTS.md accuracy
# ============================================================
$agentPath = Join-Path $PackageRoot "AGENTS.md"
if (Test-Path $agentPath) {
    $agentContent = Get-Content $agentPath -Raw
    $skillDir = Join-Path (Join-Path $PackageRoot "harness") "skills"
    $actualCount = (Get-ChildItem $skillDir -Directory).Count

    # Skill count check
    if ($agentContent -match '## Skills \((\d+)\)') {
        $claimedCount = [int]$Matches[1]
        if ($claimedCount -eq $actualCount) {
            Write-Check -Id "agentsmd.skill_count" -Name "AGENTS.md skill count" -Status PASS `
                -Detail "Claims $claimedCount, filesystem has $actualCount" `
                -Evidence @{ file = $agentPath; claimed = $claimedCount; actual = $actualCount }
        } else {
            Write-Check -Id "agentsmd.skill_count" -Name "AGENTS.md skill count" -Status FAIL `
                -Severity high -Detail "Claims $claimedCount but filesystem has $actualCount" `
                -Evidence @{ file = $agentPath; claimed = $claimedCount; actual = $actualCount } `
                -Fix @{ auto = $true; command = "Update AGENTS.md header from ${claimedCount} skills to ${actualCount} skills" }
        }
    } else {
        Write-Check -Id "agentsmd.skill_count" -Name "AGENTS.md skill count" -Status WARN `
            -Detail "Could not parse skill count from AGENTS.md" `
            -Evidence @{ file = $agentPath }
    }

    # logger.ts reference
    $libDir = Join-Path $PackageRoot "lib"
    $libFiles = Get-ChildItem $libDir -File | ForEach-Object { $_.Name }
    if ($agentContent -match "logger\.ts") {
        if ($libFiles -contains "logger.ts") {
            Write-Check -Id "agentsmd.logger_ref" -Name "AGENTS.md logger.ts reference" -Status PASS `
                -Detail "logger.ts exists in lib/" `
                -Evidence @{ file = $agentPath }
        } else {
            $actualList = $libFiles -join ","
            Write-Check -Id "agentsmd.logger_ref" -Name "AGENTS.md logger.ts reference" -Status FAIL `
                -Severity high -Detail "Claims logger.ts but file does not exist" `
                -Evidence @{ file = $agentPath; claimed = "logger.ts"; onDisk = $actualList } `
                -Fix @{ auto = $true; command = "Remove 'logger.ts' from AGENTS.md" }
        }
    }

    # SHELL.md reference
    $instDir = Join-Path (Join-Path $PackageRoot "harness") "instructions"
    $hasShell = Test-Path (Join-Path $instDir "SHELL.md")
    if ($agentContent -match "SHELL\.md") {
        if ($hasShell) {
            Write-Check -Id "agentsmd.shell_ref" -Name "AGENTS.md SHELL.md reference" -Status PASS `
                -Detail "SHELL.md referenced and exists on disk" `
                -Evidence @{ file = $agentPath; referenced = "SHELL.md" }
        } else {
            Write-Check -Id "agentsmd.shell_ref" -Name "AGENTS.md SHELL.md reference" -Status WARN `
                -Severity medium -Detail "SHELL.md referenced but missing from disk" `
                -Evidence @{ file = $agentPath; referenced = "SHELL.md" }
        }
    } elseif ($hasShell) {
        Write-Check -Id "agentsmd.shell_ref" -Name "AGENTS.md SHELL.md reference" -Status WARN `
            -Severity low -Detail "SHELL.md exists on disk but AGENTS.md does not mention it" `
            -Evidence @{ file = $agentPath; onDisk = "harness/instructions/SHELL.md" }
    }
} else {
    Write-Check -Id "agentsmd.exists" -Name "AGENTS.md exists" -Status FAIL -Severity high `
        -Detail "File not found at ${agentPath}" `
        -Evidence @{ path = $agentPath }
}

# ============================================================
# CHECK 2: package.json files integrity
# ============================================================
$pkgPath = Join-Path $PackageRoot "package.json"
if (Test-Path $pkgPath) {
    $pkg = Get-Content $pkgPath -Raw | ConvertFrom-Json
    $missing = @()
    $found = @()
    foreach ($entry in $pkg.files) {
        $resolved = Join-Path $PackageRoot $entry
        if (Test-Path $resolved) { $found += $entry }
        else { $missing += $entry }
    }
    if ($missing.Count -eq 0) {
        Write-Check -Id "pkg.files_integrity" -Name "package.json files field" -Status PASS `
            -Detail "All $($pkg.files.Count) entries exist on disk" `
            -Evidence @{ file = $pkgPath; entries = @($pkg.files) }
    } else {
        Write-Check -Id "pkg.files_integrity" -Name "package.json files field" -Status FAIL `
            -Severity high -Detail "$($missing.Count) entry(s) missing: $($missing -join ',')" `
            -Evidence @{ file = $pkgPath; missing = $missing } `
            -Fix @{ auto = $false; command = "Create or remove from files: $($missing -join ',')" }
    }
} else {
    Write-Check -Id "pkg.exists" -Name "package.json exists" -Status FAIL -Severity high `
        -Detail "File not found at ${pkgPath}" `
        -Evidence @{ path = $pkgPath }
}

# ============================================================
# CHECK 3: Harness resolver prerequisites
# ============================================================
# Hardcode the exact known paths — no array gymnastics
$hDir = Join-Path $PackageRoot "harness"
$requiredFiles = @(
    ,@("codex", "CHARTER.md")
    ,@("codex", "AUTOPILOT.md")
    ,@("skills", "oh-planner", "SKILL.md")
)
$allOk = $true
$missingReq = @()
foreach ($pair in $requiredFiles) {
    $path = Join-Path $hDir (Join-Path $pair[0] $pair[1])
    if (-not (Test-Path $path)) {
        $allOk = $false
        $missingReq += ($pair[0] + "/" + $pair[1])
    }
}
if ($allOk) {
    Write-Check -Id "harness.required_files" -Name "Harness resolver prerequisites" -Status PASS `
        -Detail "All 3 required files resolve" `
        -Evidence @{ root = $hDir; required = @("codex/CHARTER.md","codex/AUTOPILOT.md","skills/oh-planner/SKILL.md") }
} else {
    Write-Check -Id "harness.required_files" -Name "Harness resolver prerequisites" -Status FAIL `
        -Severity high -Detail "Missing: $($missingReq -join ',')" `
        -Evidence @{ root = $hDir; missing = $missingReq } `
        -Fix @{ auto = $false; command = "Create missing: $($missingReq -join ',')" }
}

# ============================================================
# CHECK 4: Test health (direct & call from PowerShell — works)
# ============================================================
Push-Location $PackageRoot
$testOut = & "bun" "test" 2>&1 | Out-String
Pop-Location
$passCount = 0; $failCount = 0; $totalCount = 0
if ($testOut -match '(\d+) pass') { $passCount = [int]$Matches[1] }
if ($testOut -match '(\d+) fail') { $failCount = [int]$Matches[1] }
if ($testOut -match 'Ran (\d+) tests') { $totalCount = [int]$Matches[1] }

if ($failCount -eq 0 -and $totalCount -gt 0) {
    Write-Check -Id "test.health" -Name "Test health" -Status PASS `
        -Severity high -Detail "$passCount pass, $failCount fail ($totalCount total)" `
        -Evidence @{ pass = $passCount; fail = $failCount; total = $totalCount }
} elseif ($totalCount -eq 0) {
    $truncated = $testOut.Substring(0, [Math]::Min(200, $testOut.Length))
    Write-Check -Id "test.health" -Name "Test health" -Status FAIL `
        -Severity high -Detail "No test output" `
        -Evidence @{ outputTruncated = $truncated } `
        -Fix @{ auto = $false; command = "bun test" }
} else {
    $truncated = $testOut.Substring(0, [Math]::Min(500, $testOut.Length))
    Write-Check -Id "test.health" -Name "Test health" -Status FAIL `
        -Severity high -Detail "$passCount pass, $failCount fail ($totalCount total)" `
        -Evidence @{ pass = $passCount; fail = $failCount; total = $totalCount; outputTruncated = $truncated } `
        -Fix @{ auto = $false; command = "bun test" }
}

# ============================================================
# CHECK 5: TypeScript compilation
# ============================================================
Push-Location $PackageRoot
$tscOut = & "bunx" "tsc" "--noEmit" 2>&1 | Out-String
Pop-Location
if ([string]::IsNullOrWhiteSpace($tscOut) -or $tscOut.Trim() -eq "") {
    Write-Check -Id "tsc.compilation" -Name "TypeScript compilation" -Status PASS `
        -Severity high -Detail "Clean compilation (strict mode, noEmit)" `
        -Evidence @{ command = "bunx tsc --noEmit"; errors = 0 }
} else {
    $errorCount = ($tscOut.Trim() -split "`n").Count
    $truncated = $tscOut.Substring(0, [Math]::Min(1000, $tscOut.Length))
    Write-Check -Id "tsc.compilation" -Name "TypeScript compilation" -Status FAIL `
        -Severity high -Detail "$errorCount error(s)" `
        -Evidence @{ command = "bunx tsc --noEmit"; errors = $errorCount; outputTruncated = $truncated } `
        -Fix @{ auto = $false; command = "bunx tsc --noEmit" }
}

# ============================================================
# CHECK 6: No secrets in repo
# ============================================================
$patterns = @("*.env*", "*.key", "*secret*", "credentials*", "auth.json", "*.pem")
$secretsFound = @()
foreach ($pattern in $patterns) {
    $matches = Get-ChildItem -Path $PackageRoot -Recurse -Filter $pattern -ErrorAction SilentlyContinue `
        | Where-Object { -not ($_.FullName -like "*node_modules*") }
    foreach ($m in $matches) { $secretsFound += $m.FullName }
}
if ($secretsFound.Count -eq 0) {
    Write-Check -Id "security.secrets" -Name "No secrets in repo" -Status PASS `
        -Severity high -Detail "No .env, *.key, credentials, or auth.json found" `
        -Evidence @{ patternsScanned = $patterns; found = @() }
} else {
    Write-Check -Id "security.secrets" -Name "No secrets in repo" -Status FAIL `
        -Severity high -Detail "Found $($secretsFound.Count) sensitive file(s)" `
        -Evidence @{ patternsScanned = $patterns; found = $secretsFound } `
        -Fix @{ auto = $false; command = "Remove sensitive files and update .gitignore" }
}

# ============================================================
# CHECK 7: .gitignore coverage
# ============================================================
$gitignorePath = Join-Path $PackageRoot ".gitignore"
if (Test-Path $gitignorePath) {
    $gitignoreContent = Get-Content $gitignorePath -Raw
    $expected = @("node_modules", ".config", ".opencode", "PLAN.d", "coverage", "*.tgz")
    $missing = @()
    $present = @()
    foreach ($e in $expected) {
        if ($gitignoreContent -match [regex]::Escape($e)) { $present += $e }
        else { $missing += $e }
    }
    if ($missing.Count -eq 0) {
        Write-Check -Id "safety.gitignore" -Name ".gitignore coverage" -Status PASS `
            -Severity medium -Detail "All expected entries present" `
            -Evidence @{ file = $gitignorePath; entries = $expected }
    } else {
        Write-Check -Id "safety.gitignore" -Name ".gitignore coverage" -Status WARN `
            -Severity medium -Detail "Missing: $($missing -join ',')" `
            -Evidence @{ file = $gitignorePath; present = $present; missing = $missing }
    }
} else {
    Write-Check -Id "safety.gitignore" -Name ".gitignore exists" -Status FAIL -Severity high `
        -Detail "File not found at ${gitignorePath}" `
        -Evidence @{ path = $gitignorePath }
}

# ============================================================
# CHECK 8-10: Runtime state via opencode CLI
# ============================================================
if (-not $SkipOCChecks) {
    $pathsOut = & "opencode" "debug" "paths" 2>&1 | Out-String
    if ($LASTEXITCODE -eq 0 -and $pathsOut.Trim().Length -gt 0) {
        Write-Check -Id "oc.paths" -Name "opencode paths" -Status PASS -Severity low `
            -Detail "Paths resolved" -Evidence @{ raw = $pathsOut.Trim() }
    } else {
        Write-Check -Id "oc.paths" -Name "opencode paths" -Status SKIP -Severity low `
            -Detail "opencode CLI not available (exit $LASTEXITCODE)" `
            -Evidence @{ exitCode = $LASTEXITCODE }
    }

    $configOut = & "opencode" "debug" "config" 2>&1 | Out-String
    if ($LASTEXITCODE -eq 0 -and $configOut.Trim().Length -gt 0) {
        $hasPlugin = $configOut -match "openhermes"
        Write-Check -Id "oc.plugin_loaded" -Name "OpenHermes plugin loaded" -Status $(if ($hasPlugin) { "PASS" } else { "FAIL" }) `
            -Severity high -Detail $(if ($hasPlugin) { "Found in resolved config" } else { "Not found in resolved config" }) `
            -Evidence @{ pluginName = "openhermes"; found = $hasPlugin }
    } else {
        Write-Check -Id "oc.plugin_loaded" -Name "OpenHermes plugin loaded" -Status SKIP -Severity high `
            -Detail "Could not read config (exit $LASTEXITCODE)" `
            -Evidence @{ exitCode = $LASTEXITCODE }
    }

    $skillOut = & "opencode" "debug" "skill" 2>&1 | Out-String
    if ($LASTEXITCODE -eq 0 -and $skillOut.Trim().Length -gt 0) {
        $ohCount = @($skillOut | Select-String -Pattern "oh-").Count
        Write-Check -Id "oc.skills_discovered" -Name "OH skills discovered" -Status $(if ($ohCount -ge 30) { "PASS" } else { "WARN" }) `
            -Severity high -Detail "$ohCount oh-* skills found (expected >= 30)" `
            -Evidence @{ count = $ohCount; minExpected = 30 }
    } else {
        Write-Check -Id "oc.skills_discovered" -Name "OH skills discovered" -Status SKIP -Severity high `
            -Detail "Could not list skills (exit $LASTEXITCODE)" `
            -Evidence @{ exitCode = $LASTEXITCODE }
    }
} else {
    Write-Check -Id "oc.paths" -Name "opencode paths" -Status SKIP -Severity low -Detail "Skipped" -Evidence @{ flag = "SkipOCChecks" }
    Write-Check -Id "oc.plugin_loaded" -Name "OpenHermes plugin loaded" -Status SKIP -Severity high -Detail "Skipped" -Evidence @{ flag = "SkipOCChecks" }
    Write-Check -Id "oc.skills_discovered" -Name "OH skills discovered" -Status SKIP -Severity high -Detail "Skipped" -Evidence @{ flag = "SkipOCChecks" }
}

# ============================================================
# SUMMARY
# ============================================================
$passCount = ($script:checks | Where-Object { $_.status -eq "PASS" }).Count
$warnCount = ($script:checks | Where-Object { $_.status -eq "WARN" }).Count
$failCount = ($script:checks | Where-Object { $_.status -eq "FAIL" }).Count
$skipCount = ($script:checks | Where-Object { $_.status -eq "SKIP" }).Count

$verdict = if ($failCount -gt 0) { "HAS_FAILURES" } elseif ($warnCount -gt 0) { "HAS_WARNINGS" } else { "ALL_CLEAN" }

$routing = switch ($verdict) {
    "ALL_CLEAN"    { "proceed" }
    "HAS_WARNINGS"  { "proceed_with_caution" }
    "HAS_FAILURES"  { "investigate" }
}

$summary = @{
    verdict = $verdict
    summary = @{
        pass  = $passCount
        warn  = $warnCount
        fail  = $failCount
        skip  = $skipCount
        total = ($passCount + $warnCount + $failCount + $skipCount)
    }
    routing = $routing
}

$summary | ConvertTo-Json -Compress -Depth 3
