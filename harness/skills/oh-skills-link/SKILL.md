---
name: oh-skills-link
description: "Link skills from harness to agent config global path"
---

# oh-skills-link

## When to Use
After installing new skills or updating existing ones. Syncs skills from the OpenHermes harness to the agent's global skills directory.

## Workflow
1. Read skills from `harness/skills/`
2. Copy to `~/.config/opencode/skills/`
3. Skip unchanged skills (checksum-based)
4. Log newly linked or updated skills

## Anti-patterns
- Linking skills without verifying they exist in harness
- Overwriting user-modified global skills without checksum check
- Linking broken or incomplete skills
