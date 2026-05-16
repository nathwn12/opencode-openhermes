---
name: oh-issue
description: "Use when a plan, spec, or PRD needs to be broken into independently-grabbable GitHub issues for team execution."
tier: 2
triggers:
  - "break into issues"
  - "create issues from plan"
  - "issue breakdown"
route:
  pass: done
  fail: oh-planner
  blocker: surface
---

# oh-issue

## When to Use
Plan/PRD needs breaking into actionable issues. Vertical tracer-bullet slices.

## Workflow
1. Read plan or PRD
2. Identify vertical slices — self-contained, independently shippable
3. Write each issue: title, acceptance criteria, implementation notes, dependencies
4. `gh issue create` to publish
5. Label + milestone appropriately

## Issue Structure
- **Title**: action-oriented ("Add user auth API")
- **AC**: concrete, testable ("User signs up with email + password")
- **Notes**: pointers for implementer
- **Deps**: what must come first
- **Labels**: type, priority, area

## Anti-patterns
- Horizontal slicing (no one ships "DB layer" alone)
- Issues too large (3+ days) or too small (<1 hour)
- Missing acceptance criteria

## Routing

| Outcome | Route |
|---------|-------|
| pass | done (issues published) |
| fail | → oh-planner (re-spec unclear slices) |
| blocker | → surface |
