---
name: oh-plan-review
description: "Multi-lens plan review: 4 perspectives in one skill. Choose Engineering (architecture/scope), Design (UX/interaction), DX (API/CLI ergonomics), or Strategy (product/CEO). Interactive — walks through findings one section at a time."
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

# oh-plan-review

Four lenses in one skill. Interactive — walk findings one section at a time. Read-only — output is a better plan, not a document about the plan.

**This skill is chunked.** See the [skill index](../skills/oh-plan-review/SKILL.md#section-index) for available sections. Read only the section file you need from `harness/skills/oh-plan-review/sections/`.

## Section Index

| # | Section | Covers |
|---|---------|--------|
| 1 | `sections/01-lens-selection.md` | Keyword-to-lens routing table mapping terms (architecture, UI, CLI, product) to four review lenses |
| 2 | `sections/02-engineering-lens.md` | Scope challenge, Architecture Review procedure (8 issues max, anti-skip), cognitive patterns |
| 3 | `sections/03-design-dx-lenses.md` | Design criteria (empty states, hierarchy, AI slop, a11y) and DX evaluation (Hello World time, error quality, modes) |
| 4 | `sections/04-strategy-rules-routing.md` | Strategy scope modes, patterns (Bezos/Munger/Jobs), prime directives, interactive rules, output, routing |
