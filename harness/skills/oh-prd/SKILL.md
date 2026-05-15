---
name: oh-prd
description: "Turn conversation context into a PRD and publish as GitHub issue"
tier: 2
triggers:
  - "write a prd"
  - "product requirements"
  - "prd for"
route:
  pass: oh-issue
  fail: oh-grill
  blocker: surface
---

# oh-prd

## When to Use
When a feature discussion has produced enough context to write a product requirements document. Captures the decision tree and outputs a structured issue.

## Workflow
1. Extract requirements from conversation history
2. Structure into PRD format: problem statement, target users, requirements (must/should/could), out of scope
3. Create as GitHub issue with `gh issue create`
4. Add triage label for prioritisation

## PRD Structure
- **Problem** — what problem does this solve?
- **Target users** — who benefits?
- **Requirements** — must have / should have / could have
- **Out of scope** — explicitly what's NOT included
- **Success metrics** — how will we know it works?

## Anti-patterns
- Writing PRD before understanding the problem
- Requirements that aren't testable ("fast" vs "loads in <200ms")
- Gold-plating — every feature is "must have"

## Routing

| Outcome | Route |
|---------|-------|
| pass | → oh-issue (break PRD into actionable issues) |
| fail | → oh-grill (stress-test unclear requirements) |
| blocker | → surface to user |
