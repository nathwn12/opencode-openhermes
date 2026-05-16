---
name: oh-triage
description: "Use when new issues need triage — classify, prioritise, and assign through the triage state machine."
tier: 2
route:
  pass:
    - oh-issue
    - oh-handoff
  fail: oh-expert
  blocker: surface
---

# oh-triage

Classify, prioritise, and assign new issues through the triage state machine.

## Steps

1. Read issues with `needs-triage` label
2. Classify: bug / feature / enhancement / question
3. Assess severity and priority
4. Assign state and owner
5. Add triage metadata labels

## Routing

| Outcome | Route |
|---------|-------|
| pass | → oh-issue or oh-handoff |
| fail | → oh-expert |
| blocker | → surface |
