---
name: oh-fusion
description: "Skill ingestion pipeline: discover, analyze, filter, adapt, fuse, and integrate external skills into the OH harness. Use when the user has an existing skill, finds a skill in their .agents/skills, or wants to bring an external capability into OH."
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

# oh-fusion

Skill ingestion pipeline: Discover → Analyze → Decide → Adapt → Fuse (opt) → Integrate. Every fused skill wires into AUTOPILOT, ROUTING, and the self-driving engine.
See [DEEP.md](../skills/oh-fusion/DEEP.md) for the full reference.
## Anti-Patterns
- Importing without analysis (always run Phase 2)
- Keeping everything — ~50% of external skills is fluff
- Fusing incompatible domains (confusing to model and user)
- Naming after source ("oh-tailwind-v2") instead of capability ("oh-styles")
- Skipping route frontmatter — without it, autopilot can't route
- Overwriting existing routing without checking for collisions
## Routing
| Outcome | Route |
|---------|-------|
| Integration complete | → oh-skills-link (verify discovery) |
| Fusion needs iteration | → oh-skill-craft |
| Analysis: discard | → surface |
| Analysis: ask | → surface with recs |
| Blocker | → surface |
