---
name: oh-skills-list
description: "Use when the user wants to see available OH skills. Lists all oh-* skills with descriptions."
tier: 2
route:
  pass: done
  fail: surface
  blocker: surface
---

# oh-skills-list

List all available oh-* skills with tier and description.

## Steps

1. Gather all oh-* skills from the harness
2. Format as a table: Skill | Tier | Purpose
3. Output the table to the user

## Routing

| Outcome | Route |
|---------|-------|
| pass | → done |
| fail | → surface |
| blocker | → surface |
