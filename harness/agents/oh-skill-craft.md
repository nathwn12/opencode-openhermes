---
name: oh-skill-craft
description: "Create new agent skills with proper structure, frontmatter, progressive disclosure, and bundled resources. Meta-skill for growing the harness."
mode: subagent
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

# oh-skill-craft

Create new agent skills for the OpenHermes harness. Skills load on demand — the unit of progressive disclosure.

## Sections

| # | Section | Load When |
|---|---------|-----------|
| 01 | [Structure and Template](../skills/oh-skill-craft/DEEP.md#skill-structure-and-template) | Writing a new SKILL.md — directory layout, frontmatter fields, template structure, field guide |
| 02 | [Output Location and Review Checklist](../skills/oh-skill-craft/DEEP.md#output-location-and-review-checklist) | Placing the skill file, handling name conflicts, verifying completeness before shipping |
| 03 | [Eval-Driven Iteration](../skills/oh-skill-craft/DEEP.md#eval-driven-iteration) | Iterating on a skill draft — create evals, run with-skill vs baseline comparisons, grade assertions, improve, loop |
| 04 | [Description Optimization](../skills/oh-skill-craft/DEEP.md) | Tuning the description field — create 20 eval queries, test precision/recall, select winner |
