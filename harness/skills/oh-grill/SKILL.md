---
name: oh-grill
description: "Stress-tests plans through Socratic questioning to surface assumptions and blind spots"
tier: 3
route:
  pass: oh-planner
  fail: oh-expert
  blocker: surface
---

# oh-grill

Stress-tests plans through relentless Socratic questioning. Two modes.

## Steps

1. Read the plan or design document fully
2. Interview decisions one at a time — each answer reveals new branches
3. Resolve each branch before moving to the next decision
4. Surface contradictions, blind spots, unstated assumptions, ambiguous terms
5. Propose recommended answer per decision
6. Output verified plan with flagged ambiguities

## Routing

| Outcome | Route |
|---------|-------|
| pass | → oh-planner |
| fail | → oh-expert |
| blocker | → surface |
