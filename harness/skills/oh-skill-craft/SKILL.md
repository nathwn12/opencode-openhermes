---
name: oh-skill-craft
description: "Create new agent skills with proper structure, frontmatter, progressive disclosure, and bundled resources. Meta-skill for growing the harness."
tier: 2
benefits-from: [oh-expert]
triggers:
  - "create a skill"
  - "write a skill"
  - "new skill"
  - "skill-craft"
  - "meta-skill"
  - "add a capability"
---

# oh-skill-craft

Create new agent skills for the OpenHermes harness. Skills are the unit of progressive disclosure — loaded on demand, not preloaded.

## Skill Structure

```
harness/skills/<oh-name>/
├── SKILL.md           # Main instructions (required)
├── REFERENCE.md       # Detailed docs (if SKILL.md exceeds 100 lines)
└── scripts/           # Utility scripts (if deterministic operations needed)
```

## SKILL.md Template

```markdown
---
name: oh-<name>
description: "Brief description. Use when [specific triggers]."
tier: <2|3|4>
benefits-from: [<skill-dependencies>]
triggers:
  - "<trigger phrase>"
  - "<another trigger>"
---

# oh-<name>

<one-paragraph summary>

## When to Use

<when to invoke this skill>

## Workflow

1. <step>
2. <step>
3. <step>

## Anti-patterns

- <anti-pattern 1>
- <anti-pattern 2>
```

## Description Requirements

The description is the only thing the agent sees when deciding which skill to load. Make it actionable:

**Good:** "Create new agent skills with proper structure, frontmrmatter, and bundled resources. Use when user wants to create, write, or build a new skill."

**Bad:** "Helps with skills."

## Field Guide

| Frontmatter Field | Required | Purpose |
|---|---|---|
| `name` | yes | Must match `^[a-z0-9]+(-[a-z0-9]+)*$` and directory name |
| `description` | yes | Max 200 chars. First sentence = what it does. Second = when to use. |
| `tier` | no | 2=tool, 3=strategic, 4=autonomous. Controls preamble verbosity. |
| `benefits-from` | no | Skill dependencies. Listed skills should be loaded first. |
| `triggers` | no | Natural language patterns that should route to this skill. |

## When to Add Scripts
- Operation is deterministic (validation, formatting)
- Same code would be generated repeatedly
- Errors need explicit handling

Scripts save tokens and improve reliability vs generated code.

## When to Split Files
- SKILL.md exceeds 100 lines
- Content has distinct domains
- Advanced features are rarely used (put in REFERENCE.md)

## Review Checklist

- [ ] Description includes triggers ("Use when...")
- [ ] SKILL.md under 100 lines
- [ ] No time-sensitive info (dates, versions, deprecation warnings)
- [ ] Consistent oh- prefix and terminology
- [ ] Concrete examples included
- [ ] Anti-patterns documented
- [ ] Tests still pass after adding (`npm test`)

## Routing

| Outcome | Route |
|---------|-------|
| pass | → oh-skills-link (verify skill discovery) |
| fail | → oh-expert (diagnose skill creation issues) |
| blocker | → surface to user |
