---
name: oh-skills-link
description: "Verify that OpenCode can discover the package-local skills directory"
---

# oh-skills-link

## When to Use
After installing new skills or updating existing ones. Verifies that OpenCode can discover the package-local skills directory.

## Workflow
1. Read skills from `harness/skills/`
2. Confirm `config.skills.paths` points at the package-local harness path
3. Skip unchanged skills when checking manifests
4. Log missing, invalid, or newly added skills

## Anti-patterns
- Linking skills without verifying they exist in harness
- Copying skills into global config during normal operation
- Overwriting user-modified skills without explicit intent
- Linking broken or incomplete skills
