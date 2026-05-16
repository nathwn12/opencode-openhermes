---
name: oh-handoff
description: "Compact session state into a structured handoff document for transfer"
tier: 2
route:
  pass: done
  fail: surface
  blocker: surface
---

# oh-handoff

Compact session state into a structured handoff document the next agent can consume without replay.

## Steps

1. Identify session goal and current progress
2. List completed items
3. List in-progress items
4. List blockers with what's needed to resolve
5. Document key decisions with rationale
6. Extract critical context — bare essentials only
7. List relevant files with why they matter
8. Write immediate next steps

## Routing

| Outcome | Route |
|---------|-------|
| pass | → done — session end |
| fail | → surface gaps to user |
| blocker | → surface to user |
