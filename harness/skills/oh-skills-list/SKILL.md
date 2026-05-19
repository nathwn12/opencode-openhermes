---
name: oh-skills-list
description: "Use when the user wants to see available OH skills, or after installing/updating skills to verify OpenCode discovers them."
tier: 2
route:
  pass: done
  fail: surface
  blocker: surface
---

# oh-skills-list

List and verify OH skills. Supports two modes:

## Modes

### list
List all available oh-* skills with tier and description.

### verify
After installing or updating skills, verify OpenCode discovers the package-local skills directory.

## Steps

### list mode
1. Gather all oh-* skills from the harness
2. Format as a table: Skill | Tier | Purpose
3. Output the table to the user

### verify mode
1. Read `harness/skills/` directory listing
2. Confirm `config.skills.paths` points at harness path
3. Skip skills that are unchanged
4. Log missing, invalid, or newly added skills

## Routing

| Outcome | Route |
|---------|-------|
| pass | → done |
| fail | → surface |
| blocker | → surface |
