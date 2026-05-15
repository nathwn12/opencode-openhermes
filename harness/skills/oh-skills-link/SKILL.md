---
name: oh-skills-link
description: "Verify that OpenCode can discover the package-local skills directory"
tier: 2
triggers:
  - "verify skills"
  - "check skill discovery"
  - "link skills"
route:
  pass: surface
  fail: oh-skill-craft
  blocker: surface
---

# oh-skills-link

## When to Use
After installing or updating skills. Verify OpenCode discovers the package-local directory.

## Workflow
1. Read `harness/skills/`
2. Confirm `config.skills.paths` points at harness path
3. Skip unchanged skills
4. Log missing, invalid, or newly added

## Anti-patterns
- Linking without verifying files exist
- Copying to global config during normal operation
- Overwriting user-modified skills without intent
- Linking broken/incomplete skills

## Routing

| Outcome | Route |
|---------|-------|
| pass | surface (report status) |
| fail | → oh-skill-craft (fix broken skill) |
| blocker | → surface |
