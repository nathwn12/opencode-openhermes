---
name: oh-manifest
description: "Full build loop: plan → build → verify → loop until done or blocker. Orchestrates oh-planner + oh-builder with auto-decisions."
tier: 4
benefits-from: [oh-planner, oh-builder, oh-expert]
triggers:
  - "manifest"
  - "full build"
  - "build loop"
  - "build until done"
  - "orchestrate"
  - "pipeline"
  - "run the plan"
---

# oh-manifest

Full build orchestration loop. Runs planner → builder → verify → repeat until done or a blocker is surfaced. Uses gstack decision principles to auto-resolve intermediate questions. Only interrupts the user for genuine blockers.

## Pipeline

### Step 1: Plan
- If `.opencode/plan.md` exists, load and verify it is current
- If not, run `oh-planner` (Mode A, B, or C depending on context)
- Auto-decide minor scope decisions using decision principles
- Surface only: premises that need human judgment, or plan/alternative conflicts

### Step 2: Build
- For each phase in plan.md, run `oh-builder` (Mode D: From Plan)
- Implements phases in dependency order
- Parallelizable phases may be delegated to sub-agents
- Auto-decide implementation choices using decision principles

### Step 3: Verify
- Check each phase against its verification criteria in plan.md
- Run tests if they exist
- If phase passes: mark complete in plan.md, proceed to next
- If phase fails: diagnose (use oh-expert self-diagnosis), fix, re-verify
- If fix is impossible within scope: surface blocker

### Step 4: Loop or Done
- All phases complete and verified → DONE
- Phase failed and cannot be fixed → BLOCKER (surface to user with context)
- Phase passed but new work discovered → add to plan, continue loop

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
- Auto-deciding premises (fundamental assumptions need user input)
- Pushing through blockers (surface immediately, don't try 5 workarounds silently)
- Skipping verification (verify every phase, not just the final result)
- Parallelizing dependent phases (respect the dependency order in plan.md)
- Forgetting to update plan.md with completion status
