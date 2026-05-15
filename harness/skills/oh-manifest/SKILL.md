---
name: oh-manifest
description: "Full build loop: plan → build → verify → loop until done or blocker. Orchestrates oh-planner + oh-builder with auto-decisions."
tier: 4
benefits-from: [oh-planner, oh-builder, oh-expert]
triggers:
  - "run the full build"
  - "full build pipeline"
  - "build loop"
  - "build until done"
  - "orchestrate this build"
  - "pipeline from plan"
  - "run the plan"
  - "manifest this"
---

# oh-manifest

Full build orchestration loop. Runs pre-flight checks → planner → builder → verify → repeat until done or a blocker is surfaced. Uses decision principles to auto-resolve intermediate questions. Only interrupts the user for genuine blockers.

## Pipeline

### Phase 0: Pre-Flight

Before any work begins, ALL of these MUST pass:

- ☐ **Quality baseline** — existing tests pass (if any). Capture output for before/after comparison.
- ☐ **Rollback path** — clean `git stash` or a committed state you can return to.
- ☐ **Branch isolation** — confirm you are on a working branch, not main/master.
- ☐ **Scope documented** — plan or task description exists and is unambiguous.

If any check fails → **STOP**. Report which check failed and why. Do not proceed to Phase 1 until the blocker is resolved.

### Step 1: Plan
- If a plan file (`~/.local/share/opencode/openhermes/plans/<project-name>-plan-<nnn>.md`) exists, load and verify it is current
- If not, run `oh-planner` (Mode A, B, or C depending on context)
- Auto-decide minor scope decisions using decision principles
- Surface only: premises that need human judgment, or plan/alternative conflicts

### Step 2: Build
- For each phase in the plan file, run `oh-builder` (Mode D: From Plan)
- Implements phases in dependency order
- Parallelizable phases may be delegated to sub-agents
- Auto-decide implementation choices using decision principles

### Step 3: Verify
- Check each phase against its verification criteria in the plan file
- Run tests if they exist
- If phase passes: mark complete in plan file, proceed to next
- If phase fails: diagnose (use oh-expert self-diagnosis), fix, re-verify
- If fix is impossible within scope: surface blocker

### Step 4: Loop or Done
- All phases complete and verified → DONE
- Phase failed and cannot be fixed → BLOCKER (surface to user with context)
- Phase passed but new work discovered → add to plan, continue loop

## Loop Patterns

Select a pattern based on the nature of the work:

| Pattern | Use When | Behavior |
|---------|----------|----------|
| **sequential** | Normal feature work | One phase at a time, verify each before next |
| **continuous-pr** | Multi-step refactors | Each phase is its own PR — commit, push, PR per phase |
| **infinite** | Watch mode, CI repair | Continue until external stop signal or budget exhausted |
| **rfc-dag** | Complex dependency chains | Resolve phase ordering by DAG; parallelize independent branches |

Default is **sequential**. Switch patterns only when the work structure demands it.

## Escalation Triggers

These conditions cause the loop to **pause** and surface to the user:

| Trigger | Condition | Action |
|---------|-----------|--------|
| **Stall** | 2 consecutive checkpoints with zero measurable progress | Pause. Report what was attempted, what blocked. |
| **Retry storm** | Same error message 3+ times in the loop | Stop retrying. Surface error with attempted fixes. |
| **Cost drift** | Cumulative changes exceed scope documented in pre-flight | Pause. Show diff between planned and actual scope. |
| **Quality regression** | Verify phase scores lower than pre-flight baseline | Pause. Report degraded metrics. Do not push through. |

These are not optional suggestions. When a trigger fires, the loop **must** pause and report.

## Decision Principles

Auto-resolve these without asking the user:

1. **Completeness over cleverness** — cover more cases
2. **Boil the lake** — fix blast radius, not symptom
3. **Pragmatic over perfect** — cleaner option that ships today
4. **DRY but not premature** — third instance is the time to abstract
5. **Explicit over implicit** — clear code over magic
6. **Bias toward action** — when in doubt, make progress

Surface to user only:
- **Premises** — fundamental assumptions that change the nature of the build
- **Dead end** — all viable paths have significant trade-offs
- **Cross-model disagreement** — two approaches both have strong arguments

## Blocker Protocol

When a blocker is encountered:

1. **Describe the blocker** — what was attempted, what failed, why it cannot proceed
2. **Propose alternatives** — scope reduction, dependency change, architectural shift
3. **Surface to user** with: `BLOCKER: <description> | Options: <A, B, C>`
4. **Wait for user decision** before continuing

## Anti-patterns
- Skipping pre-flight (every loop needs a baseline and a rollback plan)
- Auto-deciding premises (fundamental assumptions need user input)
- Pushing through blockers (surface immediately, don't try 5 workarounds silently)
- Skipping verification (verify every phase, not just the final result)
- Parallelizing dependent phases (respect the dependency order in the plan file)
- Forgetting to update the plan file with completion status
- Ignoring escalation triggers (stall means pause, not try harder)

## Routing

| Outcome | Route |
|---------|-------|
| pass | → pipeline continues (planner→builder→gauntlet→ship) |
| fail | → oh-expert (diagnose loop failure) |
| blocker | → surface to user with context and options |
