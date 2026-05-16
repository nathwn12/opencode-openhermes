---
name: oh-triage
description: "Use when new issues need triage — classify, prioritise, and assign through the triage state machine."
tier: 2
triggers:
  - "triage this issue"
  - "classify this issue"
  - "triage the backlog"
route:
  pass:
    - oh-issue
    - oh-handoff
  fail: oh-expert
  blocker: surface
---

# oh-triage

**Example:** New issues appear with needs-triage label. Read issue, classify as bug/feature/enhancement, assess severity, assign state (ready-for-agent / ready-for-human / needs-info).

## When to Use
New issues or backlog review. Drives through triage state machine.

## States
1. Needs triage (new, unclassified)
2. Needs info (waiting on reporter)
3. Ready for agent (well-specified)
4. Ready for human (needs judgment/access)
5. Wontfix (declined with reason)

## Workflow
1. Read issues with `needs-triage` label
2. Classify: bug / feature / enhancement / question
3. Assess severity + priority
4. Assign state + owner
5. Add triage metadata labels

## Anti-patterns
- Issues stuck in "needs triage"
- Triaging without reading full issue
- Wontfix without explanation

## Routing

| Outcome | Route |
|---------|-------|
| pass | → oh-issue or oh-handoff |
| fail | → oh-expert (clarify ambiguous) |
| blocker | → surface |
