---
name: oh-issue
description: "Break a plan, spec, or PRD into independently-grabbable GitHub issues"
triggers:
  - "break into issues"
  - "create issues from plan"
  - "issue breakdown"
---

# oh-issue

## When to Use
When a plan exists and needs to be broken into actionable issues. Uses tracer-bullet vertical slices for independent work items.

## Workflow
1. Read the plan or PRD
2. Identify vertical slices — self-contained features that ship independently
3. Write each issue with: clear title, acceptance criteria, implementation notes, dependencies
4. Use `gh issue create` to publish each issue
5. Label and milestone each issue appropriately

## Issue Structure
- **Title**: action-oriented ("Add user authentication API")
- **Acceptance criteria**: concrete, testable ("User can sign up with email + password")
- **Implementation notes**: pointers for the implementer
- **Dependencies**: what must be done first
- **Labels**: type, priority, area

## Anti-patterns
- Horizontal slicing (DB layer / API layer / UI layer — no one ships a layer)
- Issues too large (3+ days) or too small (< 1 hour)
- Writing issues without acceptance criteria

## Routing

| Outcome | Route |
|---------|-------|
| pass | → [done — issues published to tracker] |
| fail | → oh-planner (re-spec unclear slices) |
| blocker | → surface to user |
