---
name: oh-learn
description: "Capture, review, and promote session learnings as reusable instincts"
tier: 2
route:
  pass: done
  fail: surface
  blocker: surface
---

# oh-learn

Distill session patterns into instincts, cluster into skill candidates, and promote high-signal patterns.

## Steps

1. Scan session for repeated decisions
2. Write instinct for each pattern — trigger, action, confidence
3. Check existing file for near-duplicates; merge or append
4. Group instincts by category and topic
5. Promote high-confidence instincts (≥0.85, ≥10 applications) to global scope
6. Prune stale low-confidence instincts (<0.3, >30 days)

## Routing

| Outcome | Route |
|---------|-------|
| pass | → done |
| fail | → surface |
| blocker | → surface |
