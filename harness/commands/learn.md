---
description: Create a new skill from recent work patterns
agent: OpenHermes
subtask: true
---

# Learn Command

Create a new reusable skill from recent work patterns. $ARGUMENTS

## Your Task

1. **Search backlog** for pending skill candidates:
   - Use `search_memory` with query="skill-candidate" classes=["backlog"]
   - If $ARGUMENTS is non-empty, narrow search to that topic
2. **Analyze the candidate** — what pattern did the session reveal?
3. **Create the skill**:
   - Load the skill-creator skill: `skill({ name: "skill-creator" })`
   - Follow its instructions to create a new SKILL.md
   - Target: `%USERPROFILE%\.config\opencode\skills\<name>\SKILL.md`
   - Naming: lowercase, hyphenated, descriptive
4. **Close the backlog entry**: `add_memory(class="backlog", id="<candidate-id>", data={..., status:"closed"})`
5. **Report**: What skill was created, where, and what it does

## Skill Requirements

- name: lowercase-hyphenated, 1-64 chars
- description: 1-1024 chars, specific enough for agent to know when to load
- Must include frontmatter with name + description
- Must include: what it does, when to use it, step-by-step workflow

## Report Format

**Skill Created**: `<name>`
**Path**: `%USERPROFILE%\.config\opencode\skills\<name>\SKILL.md`
**Purpose**: [one-line summary]
**Trigger words**: [when agent should load this skill]
