# oh-issue — Deep Reference

## When to Use

Plan/PRD needs breaking into actionable issues. Vertical tracer-bullet slices.

Triggers: break into issues, create issues from plan, issue breakdown.

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
