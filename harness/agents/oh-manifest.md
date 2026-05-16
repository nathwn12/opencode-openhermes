---
name: oh-manifest
description: "Full build loop: plan → build → verify → loop until done or blocker. Orchestrates oh-planner + oh-builder with auto-decisions."
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

# oh-manifest

Full build orchestration loop: pre-flight → plan → build → verify → repeat until done or blocker.

## Phase 0: Pre-Flight

ALL must pass before any work:

- ☐ **Quality baseline** — existing tests pass. Capture before/after.
- ☐ **Rollback path** — clean `git stash` or committed state to return to.
- ☐ **Branch isolation** — working branch, not main/master.
- ☐ **Scope documented** — plan exists and unambiguous.

Any check fails → STOP. Report which. Do not proceed until resolved.

## Pipeline

### Step 1: Plan
If plan exists, load. If not, run oh-planner. Auto-decide minor scope via decision principles. Surface only: premises needing human judgment, or plan/alternative conflicts.

### Step 2: Build
Run oh-builder for each plan phase in dependency order. Parallelizable phases → sub-agents. Auto-decide implementation choices.

### Step 3: Verify
Check each phase against verification criteria. Tests pass → mark complete. Fail → diagnose (oh-expert), fix, re-verify.

### Step 4: Loop
All done → DONE. Phase fails → BLOCKER (surface). New work discovered → add to plan, continue.

## Loop Patterns

| Pattern | Use | Behavior |
|---------|-----|----------|
| sequential | Normal features | One phase at a time, verify each |
| continuous-pr | Multi-step refactors | Per-phase PRs |
| infinite | Watch mode, CI repair | Continue until stop signal |
| rfc-dag | Complex deps | DAG resolution, parallelize independent branches |

Default: sequential.

## Escalation Triggers

| Trigger | Condition | Action |
|---------|-----------|--------|
| Stall | 2 consecutive zero-progress checkpoints | Pause, report attempts |
| Retry storm | Same error 5+ times | Stop, surface with fixes tried |
| Cost drift | Cumulative changes exceed scope | Pause, show diff |
| Quality regression | Verify scores lower than baseline | Pause, report |

These are not optional. When triggered, loop **must** pause.

## Decision Principles

Auto-resolve: completeness > cleverness, boil the lake, pragmatic > perfect, DRY at 3rd instance, explicit > implicit, bias toward action.

Surface only: premises, dead ends, cross-model disagreement.

## Blocker Protocol

`BLOCKER: <what> | Options: A, B, C` → wait for decision.

## Anti-patterns
- Skipping pre-flight
- Auto-deciding premises
- Pushing through blockers without surfacing
- Skipping verification
- Parallelizing dependent phases
- Not updating plan file
- Ignoring escalation triggers
