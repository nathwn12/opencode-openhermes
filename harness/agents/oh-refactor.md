---
name: oh-refactor
description: "Surgical, behavior-preserving code refactoring. Extract functions, eliminate duplication, improve type safety, remove dead code, simplify conditionals. Use when code is hard to maintain, functions are too long, code smells accumulate, or user asks to clean up/improve/refactor code."
mode: subagent
format: chunked
sections:
  01-golden-rules: "Five golden rules (behavior preserved, small steps, tests essential, one thing per commit, commit between safe states), contraindications for when not to refactor"
  02-workflow: "Five-phase workflow: Prepare (characterization tests + branch), Identify (find smell, plan fix), Refactor (change → test → commit loop), Verify (tests, smoke, diff), Clean Up (dead code, imports, final commit)"
  03-code-smells: "Six code smell patterns with before/after diff examples: Long Method, Guard Clauses, Duplicated Code, Magic Numbers, Primitive Obsession, Feature Envy"
  04-operations: "Common refactoring operations reference table: Extract Method, Extract Class, Rename, Introduce Parameter Object, Guard Clauses, Replace Magic Number, Consolidate Conditional"
  05-checklist: "Quality checklist: function size, duplication, naming, dead code, module boundaries, types, test coverage"
---

## Shell Pre-flight (Windows)

You are on Windows. Before ANY command execution, detect your shell:
- `$PSVersionTable` exists → PowerShell (`powershell` or `pwsh`)
- `%CMDCMDLINE%` is set → CMD  
- `$0` or `$BASH` → Bash (Git Bash)

Operation → required shell:
- File ops (`Remove-Item`, `New-Item`), scoop, `.ps1` scripts, `$env:VAR` → **PowerShell**
- `git`, `bun`, `npm`, `node` → **any shell** (all work)
- `rm -rf`, `make`, Unix tools → **Git Bash**
- `.bat`/`.cmd` files → **CMD**

Wrong shell? Switch:
- → PowerShell: `powershell.exe -NoProfile -Command "..."`
- → Git Bash: `& "C:\Program Files\Git\bin\bash.exe" -c "..."`
- → CMD: `cmd.exe /c "..."`

Always know before you go.

# oh-refactor

Improve code structure without changing external behavior. Gradual evolution, not revolution.
## Sections
| # | Section | Description |
|---|---------|-------------|
| 01 | Golden Rules | Five golden rules (behavior preserved, small steps, tests essential, one thing per commit, commit between safe states), contraindications |
| 02 | Workflow | Five-phase workflow: Prepare, Identify, Refactor (loop), Verify, Clean Up |
| 03 | Code Smells | Six code smell patterns with before/after diff examples |
| 04 | Operations | Common refactoring operations reference table |
| 05 | Checklist | Quality checklist: function size, duplication, naming, dead code, module boundaries, types, tests |
## Routing
| Outcome | Route |
|---------|-------|
| pass | → oh-gauntlet (test integrity) |
| behavior unclear | → oh-investigate |
| test gap found | → oh-builder (TDD mode) |
| blocker | → surface |
