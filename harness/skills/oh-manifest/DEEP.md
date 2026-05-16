# oh-manifest — Deep Reference

## Phase 0: Pre-Flight

ALL must pass before any work:

- ☐ **Quality baseline** — existing tests pass. Capture before/after.
- ☐ **Rollback path** — clean `git stash` or committed state to return to.
- ☐ **Branch isolation** — working branch, not main/master.
- ☐ **Scope documented** — plan exists and unambiguous.

Any check fails → STOP. Report which. Do not proceed until resolved.

**Continuous execution:** Execute all tasks without pausing for progress check-ins between them. Only stop for BLOCKED, genuine ambiguity, or all tasks complete.

## Pipeline

### Step 1: Plan
If plan exists, load. If not, run oh-planner. Auto-decide minor scope via decision principles. Surface only: premises needing human judgment, or plan/alternative conflicts.

### Step 2: Build
Run oh-builder for each plan phase in dependency order. Parallelizable phases → sub-agents. Auto-decide implementation choices.

**Two-stage review (in order — never reverse):**
1. **Spec compliance first** — Does the output match the plan/spec requirements? Quote the spec. No scope creep, no missing requirements.
2. **Code quality second** — Only after spec compliance is ✅. Architecture, readability, test quality, edge cases.

**Implementer status protocol** — Implementers report one of:

| Status | Action |
|--------|--------|
| **DONE** | Proceed to spec review |
| **DONE_WITH_CONCERNS** | Read concerns before proceeding |
| **NEEDS_CONTEXT** | Provide context, re-dispatch |
| **BLOCKED** | Assess: context problem? capability gap? task too large? plan wrong? |

Never ignore BLOCKED or retry same approach without changes.

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

**Model selection guidance:**
- Mechanical tasks (isolated, 1-2 files, clear spec) → fast cheap model
- Integration tasks (multi-file, coordination) → standard model
- Architecture/design/review tasks → most capable model

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
- Starting code quality review before spec compliance is ✅
- Ignoring implementer BLOCKED status and retrying with same approach
- Pausing between tasks for progress updates (breaks flow)
