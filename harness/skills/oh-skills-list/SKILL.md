---
name: oh-skills-list
description: "List all available oh-* skills with descriptions"
tier: 2
triggers:
  - "list skills"
  - "what skills exist"
  - "available skills"
route:
  pass: done
  fail: surface
  blocker: surface
---

# oh-skills-list

## When to Use
User wants to see available skills. Lists all oh-* skills with tier and description.

## Output
| Skill | Tier | Purpose |
|-------|------|---------|
| oh-<name> | 2/3/4 | <description> |

## Anti-patterns
- Filtering skills (show everything — let user decide)
- Including non-OH skills in the output

## Routing

| Outcome | Route |
|---------|-------|
| pass | done |
| fail | surface |
| blocker | surface |
