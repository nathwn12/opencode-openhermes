---
name: oh-retro
description: "Use at the end of a sprint or milestone to analyze commit history, work patterns, and extract actionable insights for the next cycle."
tier: 3
route:
  pass: oh-planner
  fail: oh-handoff
  blocker: surface
---

# oh-retro

Analyze shipped work and extract actionable insights for the next cycle.

## Steps

1. Read git log since last retro
2. Categorize commits: features, fixes, refactors, docs, chores
3. Analyze recurring themes, bottlenecks, and bug types
4. Document praise: good work, patterns, decisions
5. Identify growth areas with specific improvement suggestions
6. Track trends against previous retros

## Routing

| Outcome | Route |
|---------|-------|
| pass | → oh-planner |
| fail | → oh-handoff |
| blocker | → surface |
