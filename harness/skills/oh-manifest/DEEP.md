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

## Autopilot Mode

When oh-manifest runs in autopilot mode (default for well-understood tasks), all
intermediate decisions are auto-resolved using the 6 principles below. Only taste
decisions, premise conflicts, and cross-model disagreements are surfaced at a
final approval gate.

### Trigger

Autopilot activates automatically when:
- The plan is well-scoped (concrete entities, measurable criteria)
- No security-sensitive changes (auth, crypto, PII)
- User previously approved autopilot or says "just do it"

### The 6 Decision Principles

These rules auto-answer every intermediate question:

| # | Principle | Meaning |
|---|-----------|---------|
| 1 | **Completeness over cleverness** | Cover more cases. Clever shortcuts miss edge cases. |
| 2 | **Boil the lake** | Fix blast radius (modified files + direct dependents), not symptoms. Auto-approve in-radius expansions under 1 day CC effort. |
| 3 | **Pragmatic over perfect** | Ships today wins. Perfect designs that never ship are worthless. |
| 4 | **DRY at 3rd instance** | Reuse what exists. Abstract only at the 3rd concrete instance. |
| 5 | **Explicit over implicit** | Clear code over magic. 10-line obvious fix > 200-line abstraction. |
| 6 | **Bias toward action** | When in doubt, make progress. Flag concerns but don't block. |

**Conflict resolution (context-dependent):**
- Plan/Strategy phase: P1 (completeness) + P2 (boil lake) dominate
- Build/Implementation phase: P5 (explicit) + P3 (pragmatic) dominate
- Review phase: P1 (completeness) + P4 (DRY) dominate

### Decision Classification

**Mechanical** — one clearly right answer. Auto-decide silently.
Examples: Always run tests, always verify spec compliance, always fix compiler errors.

**Taste** — reasonable people could disagree. Auto-decide with recommendation but
surface at final gate. Three natural sources:
1. **Close approaches** — top two are both viable with different tradeoffs.
2. **Borderline scope** — in blast radius but 3-5 files, or ambiguous dependency chain.
3. **Implementation ambiguities** — two ways to implement same behavior, neither clearly better.

**User Challenge** — model and spec disagree with user's stated direction.
This is NEVER auto-decided. Surface with:
- What the user said (their original direction)
- What the model recommends (the change)
- Why (reasoning)
- What context we might be missing (explicit acknowledgment)
- If we're wrong, the cost is (what happens if user was right)

### What Auto-Decide Means

Auto-decide replaces the USER'S judgment with the 6 principles. It does NOT
replace the ANALYSIS. Every review section must still be executed at full depth.
The only difference: intermediate AskUserQuestion calls are answered by the
principles instead of the user.

**Always required even in autopilot:**
- READ actual code, diffs, and files each section references
- PRODUCE every output the section requires (diagrams, tables, artifacts)
- IDENTIFY every issue the section is designed to catch
- DECIDE each issue using the 6 principles
- LOG each decision in the audit trail

**Never do in autopilot:**
- Skip a section because "it doesn't apply" without stating why
- Compress a review into a one-liner table row
- Write "no issues found" without showing what was examined
- Auto-decide premises (core assumptions need human judgment)
- Auto-decide User Challenges (model agrees with spec against user direction)

### Phase Order

When running auto-review of a plan (triggered by `oh-manifest --autoreview`),
execute phases in strict sequential order — each builds on the previous:

1. **Strategy** — Challenge premises, identify scope decisions, explore alternatives
2. **Architecture** — Data flow, component boundaries, API surface, state model
3. **Design** — UI/UX gaps, interaction states, AI slop detection
4. **Engineering** — Edge cases, error handling, test coverage, performance
5. **DX** — API ergonomics, onboarding flow, error messages

Never run phases in parallel. Never skip phase order.

### Model Selection Guidance (autopilot)

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
