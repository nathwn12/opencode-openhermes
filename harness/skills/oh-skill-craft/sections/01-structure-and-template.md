# Skill Structure and Template

## Directory Layout

Every skill lives in its own directory under the harness:

```
harness/skills/<oh-name>/
├── SKILL.md        # Main instructions (required)
├── REFERENCE.md    # Extended docs (if SKILL.md > 100 lines)
└── scripts/        # For deterministic operations (validation, formatting)
```

## Template

Every SKILL.md follows this structure:

```markdown
---
name: oh-<name>
description: "Brief. Use when [triggers]."
tier: <2|3|4>
triggers: ["<phrase>"]
route:
  pass: <next>
  fail: <fallback>
  blocker: surface
---

# oh-<name>

<one-paragraph summary>

## When to Use

## Workflow

1. Step

## Anti-patterns

- List
```

## Field Guide

| Field | Purpose |
|-------|---------|
| `name` | Must match `^[a-z0-9]+(-[a-z0-9]+)*$` and directory name |
| `description` | Max 200 chars. First sentence = function, second = trigger context. |
| `tier` | 2=tool (deterministic), 3=strategic (analysis/decisions), 4=autonomous (multi-step process) |
| `triggers` | Natural language patterns for routing. Include variations the agent might say. |
| `route.pass` | Next skill after successful completion |
| `route.fail` | Fallback skill on failure or edge case |
| `route.blocker` | Where to surface blockers (usually "surface") |
