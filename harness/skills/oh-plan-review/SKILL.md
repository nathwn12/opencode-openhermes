---
name: oh-plan-review
description: "Use when a plan needs multi-perspective review before execution. Choose Engineering, Design, DX, or Strategy lens — walks through findings one section at a time."
tier: 3
route:
  pass:
    - oh-grill
    - oh-manifest
  fail: oh-planner
  blocker: surface
---

# oh-plan-review

Four-lens plan review. Interactive — walk findings one section at a time.

## Steps

1. Select lens — match keywords to lens using routing table (architecture → Engineering, UI → Design, CLI → DX, product → Strategy).
2. Read the full plan before reviewing. Understand scope before evaluating.
3. Walk through sections one at a time — interactive via AskUserQuestion.
4. Apply lens-specific criteria — scope challenge, architecture review, cognitive patterns for Engineering; empty states, hierarchy, a11y for Design; Hello World time, error quality for DX; scope modes, prime directives for Strategy.
5. Surface findings per section — max 8 issues per section. Zero findings → say so. Anti-skip: evaluate every section.
6. Update plan file — record findings and decisions in canonical plan storage.
7. Route result — pass to execution or stress-testing, fail back to revision.

## Routing

| Outcome | Route |
|---------|-------|
| pass | → oh-grill (if concerns remain) or oh-manifest (execute) |
| fail | → oh-planner (revise) |
| blocker | → surface |
