---
name: oh-prd
description: "Use when a feature or product idea needs a structured Product Requirements Document. Turns conversation context into a PRD and publishes as GitHub issue."
tier: 2
triggers:
  - "write a prd"
  - "product requirements"
  - "spec this feature"
  - "feature spec"
route:
  pass: oh-issue
  fail: oh-grill
  blocker: surface
---

# oh-prd

## When to Use
Conversation has defined a feature well enough to write requirements. Produces a structured PRD and publishes as a GitHub issue.

## PRD Structure

```markdown
# PRD: <feature name>

## Problem Statement
<what problem does this solve, for whom>

## Success Criteria
<measurable outcomes>

## Scope
### In scope
- <features included>

### Out of scope
- <explicitly excluded — prevents scope creep>

## Requirements
### Functional
- <numbered behaviors>

### Non-functional
- <performance, security, accessibility, observability>

## Open Questions
- <unresolved items>

## Dependencies
- <what must exist first>
```

## Workflow
1. Extract requirements from conversation context
2. Structure into PRD format
3. Surface open questions to user
4. Publish as GitHub issue via `gh issue create`

## Anti-patterns
- Specifying solutions instead of problems (let the builder decide how)
- Too detailed (PRD sets direction, not implementation)
- No open questions section (there are always open questions)

## Routing

| Outcome | Route |
|---------|-------|
| pass | → oh-issue (break into work items) |
| fail | → oh-grill (stress-test requirements) |
| blocker | → surface |
