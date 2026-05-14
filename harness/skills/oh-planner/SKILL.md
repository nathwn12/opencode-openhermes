---
name: oh-planner
description: "ALL-arounder planner — brainstorm, architect, autoplan, decision pipeline. Produces a consumable plan artifact."
tier: 3
benefits-from: [oh-expert, oh-grill]
triggers:
  - "plan this"
  - "how should I build"
  - "architecture"
  - "design this feature"
  - "brainstorm"
  - "autoplan"
  - "strategy"
  - "scope this"
---

# oh-planner

The ALL-arounder planner. Merges brainstorm, architecture analysis, strategy review, and automatic plan review into one skill. Produces `.opencode/plan.md` that oh-builder consumes.

## Entry Modes

Use the mode that matches the user's starting point:

### Mode A: Brainstorm (exploratory)
When the idea is fuzzy and needs shaping.

1. **Demand reality** — who specifically needs this?
2. **Status quo** — what do they do today?
3. **Desperate specificity** — what's the one concrete thing they can't do?
4. **Narrowest wedge** — what's the smallest useful version?
5. **Observation** — what will you see/hear when it works?
6. **Future-fit** — does this compound or plateau?

Output: structured design doc.

### Mode B: Architecture Analysis (existing codebase)
When the codebase feels messy or you need to understand the surface.

1. **Read the domain** — load CONTEXT.md, understand the language
2. **Map the surface** — identify modules, boundaries, dependencies
3. **Find deepening opportunities** — duplication, over-coupling, grown-beyond-purpose functions, missing abstractions
4. **Rank by impact** — effort vs value, dependencies, risk

Output: ranked refactoring candidates.

### Mode C: Structured Plan (non-trivial feature)
When requirements exist but need a plan document.

1. **Scope challenge** — before reviewing anything, answer:
   - What existing code already partially solves each sub-problem?
   - What is the minimum set of changes that achieves the stated goal?
   - **Complexity check:** 8+ files or 2+ new classes/services in a single phase → smell. Propose splitting or simplifying.
   - **Search check:** for each architectural pattern or infrastructure component the plan introduces, check whether the runtime/framework has a built-in. Search for: `{framework} {pattern} built-in`. Flag custom solutions where built-ins exist.
   - **Completeness check:** with AI-assisted coding, completeness is 10-100x cheaper than with human teams. If the plan shortcuts something to save human hours that only saves minutes with AI, recommend the complete version.
2. **Strategy review** — challenge premises, identify scope decisions, consider 10x alternatives
3. **Architecture review** — data flow, component boundaries, API surface, state model
4. **Edge case analysis** — error states, concurrency, failure modes, security implications
5. **Dependency mapping** — what blocks what, parallelizable work
6. **Write plan.md** — structured artifact with phases, deps, verification steps

### Mode D: Autoplan (plan exists, needs full review)
When a plan file exists and needs the full gauntlet. Auto-decides 90% of questions using decision principles. Surfaces only taste decisions at a final approval gate.

Runs in order: **Strategy → Architecture → Design → Engineering → DX**
Each phase must complete before the next begins.

## Decision Principles

Use these to auto-resolve intermediate questions. Only surface to the user when options are genuinely close (taste decisions):

1. **Completeness over cleverness** — Choose the option that covers more cases
2. **Boil the lake** — Fix the blast radius, not the symptom
3. **Pragmatic over perfect** — Cleaner option that ships today wins
4. **DRY but not premature** — Reuse over rebuild, but don't abstract before the third instance
5. **Explicit over implicit** — Clear code over magic
6. **Bias toward action** — When in doubt, make progress

Never auto-decide: premises (need human judgment) or cases where both the plan and the alternative have strong arguments.

## Plan Artifact

Output goes in `.opencode/plan.md` (per-project, overwritten each session) with this structure (matching the global AGENTS.md schema).

**Then save a copy** to `%USERPROFILE%/.config/opencode/task/<project-name>-plan-<nnn>.md` (global, incrementing, persistent) per AGENTS.md persistent plan rules.

```markdown
# PLAN: <project-name>

Plan ID: <project-name>-plan-<nnn>
Project: <project-name>
Status: active
Created: <local-date-time>
Updated: <local-date-time>
Project Path: <absolute-project-path>
Plan Path: .opencode/plan.md
Objective: <short objective>

## Current State

<what exists now, what's missing>

## Assumptions

- <assumption 1>
- <assumption 2>

## Tasks

- [ ] Task 1
  - [ ] Subtask 1.1

## Active Task

<what's being worked on now>

## Subagents

| Agent | Purpose | Status | Findings |
|---|---|---|---|

## Completed

- <what's done>

## Blockers

- None

## Validation

- [ ] Static checks
- [ ] Unit tests
- [ ] Manual verification

## Decisions

- <decision> — <rationale>

## Notes

<anything else>
```

## Anti-patterns
- Skipping strategy review for complex features (architecture mistakes compound)
- Plans at wrong granularity — too vague to execute or too detailed to read
- Re-opening already-decided debates ("what if we rewrite in Rust?")
- Perfect being the enemy of shipped (progress > polish)
- Failing to flag taste decisions to the user
- Big bang rewrites — plan increments, not overhauls

## Routing

| Outcome | Route |
|---------|-------|
| pass | → oh-grill (stress-test plan) |
| fail | → oh-planner (revise gaps) |
| blocker | → surface to user |
