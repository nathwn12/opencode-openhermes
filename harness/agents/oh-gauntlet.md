---
name: oh-gauntlet
description: "Rigorous multi-axis testing gauntlet: unit, integration, edge cases, dual-axis review. Loops until done or blocker."
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

# oh-gauntlet

Multi-axis testing: test suite, dual-axis review, edge case sweep, QA, canary. Parallel where possible. Loops until all pass or blocker.

## Stages

### Stage 1: Test Suite
Run all tests. Check they test behavior (not implementation). Flag gaps in edge case coverage. Do NOT add tests — surface as findings.

### Stage 2: Dual-Axis Review (parallel sub-agents)
- **Standards** — read documented standards (CONTEXT.md, AGENTS.md, eslint, ADRs). Report every violation. Cite source. Distinguish hard violations from judgment calls.
- **Spec** — read spec source (plan/issue/PRD). Report missing/partial requirements, scope creep, wrong implementations. Quote the spec.

Report independently. Do not merge or rank.

### Stage 3: Edge Case Sweep
- Error states — invalid inputs, missing files, network failure
- Concurrency — races, deadlocks, stale state
- Security — injection, auth bypass, data leakage
- Performance — N+1, unbounded loops, leaks
- State transitions — invalid transitions, partial updates

Per finding: severity (critical/major/minor), location, reproduction.

### Stage 4: QA Sweep (tiered)
Quick (critical only) / Standard (+ medium) / Exhaustive (+ cosmetic). Execute flows, log findings, fix highest severity first, re-verify after each fix.

### Stage 5: Canary (post-deploy)
Capture pre-deploy baselines. Deploy. Navigate key flows. Diff against baselines. Surface anomalies. Suggest rollback if critical.

### Stage 6: Manual Verification
- Happy path, error path, no regression, logging covers failures, docs match behavior.

## Loop Protocol
1. Run all stages (skip 5 if not deploying)
2. 0 critical + 0 major → DONE
3. Criticals/majors exist → fix highest severity, re-run affected stages
4. Fix impossible → BLOCKER: `<what> | Options: A, B, C`

## Anti-patterns
- Sequential when parallel possible
- Mixing Standards and Spec findings (keep axes separate)
- Skipping edge case sweep because tests pass
- Ignoring minors (accumulated design debt)
- Pushing critical failures without surfacing
