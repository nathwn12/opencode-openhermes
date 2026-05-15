# OpenHermes Shell Discipline

Windows-native shell detection and switching protocol. Always KNOW your shell before executing.

## Detection (run this first)

```powershell
# Returns one of: powershell, pwsh, cmd, bash
$__ohShell = if ($PSVersionTable) {
    if ($PSVersionTable.PSEdition -eq 'Core') { 'pwsh' } else { 'powershell' }
} elseif ($env:CMDCMDLINE) { 'cmd' }
elseif (Get-Variable -Name 'BASH' -ErrorAction SilentlyContinue) { 'bash' }
else { 'unknown' }
Write-Output "[OH-SHELL] $__ohShell"
```

CMD detection alternative: `echo %CMDCMDLINE%`
Bash detection alternative: `echo $0` or `echo $BASH`

## Operation → Required Shell

| If you need to... | Use this shell | Because |
|---|---|---|
| `scoop install/update/status` | PowerShell | Scoop is a PowerShell module |
| `Remove-Item` / `New-Item` / file ops | PowerShell | Native cmdlets, handles paths |
| Run `.ps1` / `-NoProfile -Command` | PowerShell | Execution policy, module loading |
| Read/set env vars | PowerShell | `$env:VAR` syntax |
| `git *` | Any | Works in all 3 |
| `bun *` / `npm *` / `node *` | Any | Works in all 3 |
| `rm -rf` / `chmod` / unix tools | Bash (Git Bash) | Unix-only commands |
| `make` / `sh` scripts | Bash (Git Bash) | Unix-only |
| `.bat` / `.cmd` scripts | CMD | Native interpreter |
| `del /s` / `dir` / `copy` | CMD | CMD built-ins |
| Test exit code | PowerShell = `$LASTEXITCODE` | Cross-shell differences |
| Use `%USERPROFILE%` | CMD | CMD env syntax |



## Switching Shells

```powershell
# From CMD/Bash → PowerShell:
powershell.exe -NoProfile -Command "your-command"

# From CMD/Bash → pwsh (PowerShell 7+):
pwsh.exe -NoProfile -Command "your-command"

# From PowerShell/CMD → Git Bash:
& "C:\Program Files\Git\bin\bash.exe" -c "your-command"

# From PowerShell/Bash → CMD:
cmd.exe /c "your-command"
```

## Standardized Invocation

**Default to PowerShell** for all new operations. Switch only when the tool requires it.

PowerShell handles:
- File system ops: `Remove-Item -Recurse -Force`, `New-Item`, `Copy-Item`, `Move-Item`
- Environment: `$env:VAR`
- Package mgmt: `scoop`, `bun`, `npm`
- Git: `git` (works natively in PowerShell)
- Paths: both `/` and `\` work

## Edge Cases

| Situation | Handling |
|---|---|
| `bun` in PowerShell | Works natively |
| Long paths (>260 chars) | PowerShell handles them; CMD may truncate |
| UNC paths | PowerShell handles; CMD limited |
| Exit codes | PowerShell: `$LASTEXITCODE`; CMD: `%errorlevel%`; Bash: `$?` |
| Path separators | PowerShell: both; CMD: `\`; Bash: `/` |
| Execution policy | If .ps1 won't run: `powershell.exe -ExecutionPolicy Bypass -File script.ps1` |
| Admin checks | PowerShell: `[Security.Principal.WindowsPrincipal]::new(...)` |
