---
name: oh-skills-link
description: "Use after installing or updating skills to verify OpenCode discovers the package-local skills directory."
tier: 2
route:
  pass: surface
  fail: oh-skill-craft
  blocker: surface
---

# oh-skills-link

Verify OpenCode discovers the package-local skills directory after install/update.

## Steps

1. Read `harness/skills/` directory listing
2. Confirm `config.skills.paths` points at harness path
3. Skip skills that are unchanged
4. Log missing, invalid, or newly added skills

## Routing

| Outcome | Route |
|---------|-------|
| pass | → surface |
| fail | → oh-skill-craft |
| blocker | → surface |
