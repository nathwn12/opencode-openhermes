---
name: oh-retro
description: "Use at the end of a sprint or milestone to analyze commit history, work patterns, and extract actionable insights for the next cycle."
tier: 3
triggers:
  - "retrospective"
  - "retro for"
  - "post-ship review"
route:
  pass: oh-planner
  fail: oh-handoff
  blocker: surface
---

# oh-retro

## When to Use
End of sprint or work week. Analyze shipped work, how it went, what to improve.

## Workflow
1. Read git log since last retro
2. Categorize: features, fixes, refactors, docs, chores
3. Pattern analysis: recurring themes, bottlenecks, bug types
4. Praise: good work, patterns, decisions
5. Growth areas: specific suggestions for improvement
6. Trend tracking: compare to previous retros

## Output
Structured retro: shipped items, metrics, praise, growth areas, action items.

**Example:** End of sprint. Read git log → categorize (features, fixes, refactors) → pattern analysis → praise → growth areas → action items.

## Anti-patterns
- Blame-focused (process, not people)
- Action items without owners
- Same retro every week (nothing changed → why?)

## Routing

| Outcome | Route |
|---------|-------|
| pass | → oh-planner (start next cycle with insights) |
| fail | → oh-handoff (document blockers) |
| blocker | → surface |
