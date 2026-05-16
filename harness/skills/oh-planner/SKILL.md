---
name: oh-planner
description: "Use when a feature, architecture, or idea needs structured planning — from brainstorming through formal plan artifact. Produces consumable plan documents."
tier: 3
benefits-from: [oh-expert, oh-grill]
format: chunked
sections:
  01-brainstorm: "Mode A: vague idea shaping — 6 clarifying questions, who needs this, what they can't do, smallest useful version, success signals, compound vs plateau"
  02-architecture-analysis: "Mode B: codebase surface mapping — read CONTEXT.md, module boundaries, dependency analysis, find deepening opportunities, over-coupling, rank by impact and effort vs value"
  03-structured-plan: "Mode C: formal plan document — scope challenge, complexity check 8+ files smell, search built-in alternatives, strategy review, data flow, API surface, state model, edge case analysis, concurrency, dependency mapping, write plan artifact"
  04-autoplan: "Mode D: auto-decides 90% intermediate questions — taste decisions gate, Strategy Architecture Design Engineering DX phases, 6 auto-resolution principles, completeness, boil the lake, pragmatic, DRY, explicit, bias toward action, never auto-decide premises"
  05-plan-artifact: "Canonical storage path, plan template sections, Current State Assumptions Tasks Active Task Subagents Completed Work Log Blockers Validation Decisions Notes, self-contained no separate files"
triggers:
  - "plan this"
  - "how should I build"
  - "plan the architecture for"
  - "design this feature"
  - "brainstorm"
  - "autoplan"
  - "strategy for this feature"
  - "scope this feature"
  - "create a plan for"
  - "whats the plan for"
route:
  pass: oh-grill
  fail: oh-planner
  blocker: surface
---

# oh-planner

ALL-arounder planner. Merges brainstorm, architecture analysis, strategy, and plan review into one skill. Produces plan files in canonical storage (`~/.local/share/opencode/openhermes/plans/`).

**Example:** User says "I have an idea for the app." Run Mode A (brainstorm), shape into a plan with Mode C, save artifact.

## Sections

| # | Section | Content |
|---|---------|---------|
| 01 | [Brainstorm (Mode A)](sections/01-brainstorm.md) | Vague idea shaping — 6 clarifying questions, who needs this, what they can't do, smallest useful version, success signals, compound vs plateau |
| 02 | [Architecture Analysis (Mode B)](sections/02-architecture-analysis.md) | Codebase surface mapping — read CONTEXT.md, module boundaries, dependency analysis, find deepening opportunities, over-coupling, rank by impact and effort vs value |
| 03 | [Structured Plan (Mode C)](sections/03-structured-plan.md) | Formal plan document — scope challenge, complexity check 8+ files smell, search built-in alternatives, strategy review, data flow, API surface, state model, edge case analysis, concurrency, dependency mapping, write plan artifact |
| 04 | [Autoplan (Mode D)](sections/04-autoplan.md) | Auto-decides 90% intermediate questions — taste decisions gate, Strategy Architecture Design Engineering DX phases, 6 auto-resolution principles, completeness, boil the lake, pragmatic, DRY, explicit, bias toward action, never auto-decide premises |
| 05 | [Plan Artifact Format](sections/05-plan-artifact.md) | Canonical storage path, plan template sections (Current State, Assumptions, Tasks, Active Task, Subagents, Completed, Work Log, Blockers, Validation, Decisions, Notes), self-contained no separate files |

## Anti-patterns

- Skipping strategy review for complex features (architecture mistakes compound)
- Wrong granularity — too vague to execute or too detailed to read
- Re-opening decided debates ("what if we rewrite in Rust?")
- Perfect > shipped (progress > polish)
- Not flagging taste decisions to user
- Big bang rewrites — plan increments, not overhauls
- Skipping the user-approval gate — implementing before the user has reviewed and approved the design document
- Placeholders in plan tasks (TBD, TODO, "implement later" — makes plan unexecutable)
- Wrong granularity — tasks too large (>15 min) or too vague to execute
- Missing expected output in test steps

## Routing

| Outcome | Route |
|---------|-------|
| pass | → oh-grill (stress-test plan) |
| fail | → oh-planner (revise gaps) |
| blocker | → surface |
