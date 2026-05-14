---
name: oh-retro
description: "Weekly engineering retrospective — analyze commit history and work patterns"
---

# oh-retro

## When to Use
At the end of a sprint or work week. Analyzes what was shipped, how it went, and what to improve.

## Workflow
1. **Analyze commits** — read git log since last retro
2. **Categorize work** — features, fixes, refactors, docs, chores
3. **Pattern analysis** — recurring themes, bottlenecks, types of bugs
4. **Praise** — call out good work, good patterns, good decisions
5. **Growth areas** — what could be better, with specific suggestions
6. **Trend tracking** — compare against previous retros

## Output
Structured retro report with: shipped items, metrics, praise, growth areas, action items.

## Anti-patterns
- Blame-focused retro (it's about process, not people)
- Action items without owners (no follow-through)
- Same retro every week (if nothing changed, why?)

## Routing

| Outcome | Route |
|---------|-------|
| pass | → oh-planner (start next cycle with retro insights) |
| fail | → oh-handoff (document blockers for next session) |
| blocker | → surface to user |
