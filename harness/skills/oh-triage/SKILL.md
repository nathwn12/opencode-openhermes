---
name: oh-triage
description: "Issue triage state machine — classify, prioritise, assign"
---

# oh-triage

## When to Use
When new issues come in, or when reviewing the issue backlog. Drives issues through a triage state machine.

## States
1. **Needs triage** — new issue, unclassified
2. **Needs info** — waiting on reporter for clarification
3. **Ready for agent** — well-specified, can be picked up
4. **Ready for human** — needs human judgment or access
5. **Wontfix** — declined with reason

## Workflow
1. Read new issues (label: `needs-triage`)
2. Classify: bug / feature / enhancement / question
3. Assess severity and priority
4. Assign to appropriate state and owner
5. Add triage metadata labels

## Anti-patterns
- Leaving issues in "needs triage" indefinitely
- Triaging without reading the full issue
- Wontfix without explanation (leaves reporter unhappy)
