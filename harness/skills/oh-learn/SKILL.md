---
name: oh-learn
description: "Review, search, prune, and export session learnings"
---

# oh-learn

## When to Use
To review what the agent has learned across sessions, search for specific patterns, prune stale knowledge, or export learnings for documentation.

## Workflow
1. **Review** — show recent learnings with context
2. **Search** — find learnings matching specific topics or patterns
3. **Prune** — remove stale, redundant, or superseded learnings
4. **Export** — format learnings for documentation or sharing

## Anti-patterns
- Hoarding every observation (most things aren't learnings)
- Never pruning (stale knowledge is worse than no knowledge)
- Storing what, not why (context-less facts are forgettable)

## Routing

| Outcome | Route |
|---------|-------|
| pass | → [done — read-only report] |
| fail | → [surface gaps to user] |
| blocker | → surface to user |
