---
name: oh-issue
description: "Break plans/PRDs into independently-grabbable GitHub issues"
tier: 2
route:
  pass: done
  fail: oh-planner
  blocker: surface
---

# oh-issue

Break plans/PRDs into vertical-slice issues with acceptance criteria and dependencies.

## Steps

1. Read plan or PRD
2. Identify vertical slices — self-contained, independently shippable
3. Write each issue with title, acceptance criteria, implementation notes, and dependencies
4. Publish issues via `gh issue create`
5. Apply labels and milestone

## Routing

| Outcome | Route |
|---------|-------|
| pass | → done |
| fail | → oh-planner |
| blocker | → surface |
