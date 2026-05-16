# oh-prd — Deep Reference

## When to Use

Conversation has defined a feature well enough to write requirements. Produces a structured PRD and publishes as a GitHub issue.

Triggers: write a prd, product requirements, spec this feature, feature spec.

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

## Anti-patterns

- Specifying solutions instead of problems (let the builder decide how)
- Too detailed (PRD sets direction, not implementation)
- No open questions section (there are always open questions)
