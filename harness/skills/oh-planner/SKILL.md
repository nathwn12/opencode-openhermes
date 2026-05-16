---
name: oh-planner
description: "Use when a feature, architecture, or idea needs structured planning — from brainstorming through formal plan artifact. Produces consumable plan documents."
tier: 3
route:
  pass: oh-grill
  fail: oh-planner
  blocker: surface
---

# oh-planner

ALL-arounder planner: brainstorm, architecture analysis, structured plan, autoplan.

## Steps

1. Determine mode — Mode A (brainstorm vague idea), Mode B (architecture analysis), Mode C (structured plan), or Mode D (autoplan).
2. Clarify scope — ask 6 clarifying questions (who needs this, current workflow, capability gap, smallest version, success signals, compound vs plateau).
3. Map code surface if applicable — module boundaries, dependencies, find deepening opportunities, rank by effort/value/risk.
4. Challenge premises — check existing code reuse, minimum changes, complexity (8+ files = smell), framework built-ins, completeness.
5. Analyze architecture — data flow, component boundaries, API surface, state model, edge cases (error, concurrency, failure, security), dependency mapping.
6. Write structured plan — canonical format: Current State, Assumptions, Tasks, Active Task, Subagents, Completed, Work Log, Blockers, Validation, Decisions, Notes.
7. Apply auto-resolution principles — completeness over cleverness, boil the lake, pragmatic over perfect, DRY at 3rd, explicit over implicit, bias toward action. Surface taste decisions.
8. Self-review — verify spec coverage, scan for placeholders (TBD/TODO), check type consistency across tasks.

## Routing

| Outcome | Route |
|---------|-------|
| pass | → oh-grill (stress-test plan) |
| fail | → oh-planner (revise gaps) |
| blocker | → surface |
