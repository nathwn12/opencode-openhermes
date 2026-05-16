---
name: oh-prd
description: "Write structured PRDs from conversation context and publish as issues"
tier: 2
route:
  pass: oh-issue
  fail: oh-grill
  blocker: surface
---

# oh-prd

Turn conversation context into a structured PRD and publish as a GitHub issue.

## Steps

1. Extract requirements from conversation context
2. Structure into formal PRD format
3. Surface open questions to user
4. Publish as GitHub issue via `gh issue create`

## Routing

| Outcome | Route |
|---------|-------|
| pass | → oh-issue |
| fail | → oh-grill |
| blocker | → surface |
