# Skills Management — SKILL.md Format, Progressive Disclosure, Agent-Managed Lifecycle

Sources: Hermes Agent SKILL.md frontmatter standard, progressive disclosure (L0/L1/L2), agent-managed skill lifecycle.

## SKILL.md Frontmatter Format

Every skill MUST have YAML frontmatter with these fields:

```yaml
---
name: my-skill
description: One-line description of what this skill does
version: 1.0.0
author: agent            # "agent" if auto-created, "user" if hand-authored
tags: [testing, python]  # Search/discovery tags
category: development    # Category grouping in skills directory
trigger:                 # Keywords that trigger loading this skill
  - test
  - tdd
  - coverage
requires_tools:          # Toolsets this skill needs to function
  - terminal
config:                  # Optional config settings
  - key: my.setting
    description: What this controls
    default: "value"
---
```

### Field Reference

| Field | Required | Type | Description |
|-------|----------|------|-------------|
| `name` | yes | string | Unique skill name, used as directory name |
| `description` | yes | string | One-line description shown in skill index |
| `version` | no | string | Semver for curated skills |
| `author` | no | string | "agent", "user", or origin identifier |
| `tags` | no | string[] | Search/discovery tags |
| `category` | no | string | Grouping category |
| `trigger` | no | string[] | Keywords that trigger progressive load (Tier 0→Tier 1) |
| `requires_tools` | no | string[] | Toolsets that must be present; skill is hidden when absent |
| `fallback_for` | no | string[] | Show this skill ONLY when listed toolsets are unavailable |
| `config` | no | object[] | Declared config settings injected on load |

### Platform Restriction

Skills can restrict themselves to specific OS platforms:

```yaml
platforms: [windows]        # Windows only
platforms: [windows, linux] # Windows and Linux
```

When set, the skill is hidden on incompatible platforms. If omitted, loads on all platforms.

### Conditional Activation (Fallback Skills)

Skills can auto-show/hide based on available tools:

```yaml
fallback_for: [web]        # Show ONLY when web tools are unavailable
requires_tools: [terminal] # Show ONLY when terminal tools are available
```

Example: A `web-search` skill with `fallback_for: [web]` stays hidden when web_search tool is available. When the tool is missing (no API key), the skill automatically appears as an alternative.

## Progressive Disclosure Loading

Skills use a token-efficient loading pattern inspired by Hermes:

```
Tier 0: Skill directory listing → names, descriptions, categories, tags (from frontmatter)
         Do: read skills/<name>/SKILL.md frontmatter on demand
         Cost: ~200 tokens for 11 skills

Tier 1: Full SKILL.md content → load the markdown body when:
         - User triggers a trigger keyword (matching `trigger` field)
         - User explicitly names the skill or runs `/skill-name`
         - A subtask or command references it
         Cost: Varies by skill (1-5K tokens)

Tier 2: Reference files → load scripts/, templates/, references/ only when:
         - Executing the skill's procedure
         - The skill instructs you to read a specific file
         Cost: Varies
```

### Trigger-Table Lazy Loading

Instead of preloading all skills at session start, use the trigger table:

| Trigger keyword | Skill to load | Condition |
|----------------|---------------|-----------|
| "test", "tdd", "coverage" | tdd-workflow | User mentions testing |
| "security", "auth", "xss" | security-review | Security-related work |
| "verify", "build", "lint" | verification-loop | Build/before-PR context |

### Duplicate Instruction Prevention

Before loading a skill, check if its instructions are already covered by:
- AGENTS.md rules already in context
- Another skill already loaded this session

If overlap is detected, skip loading to avoid context bloat.

## Agent-Managed Skill Lifecycle

The agent can create, update, and delete skills during sessions. This is the skill system's self-improvement loop.

### When to Create a Skill

- After completing a complex task (5+ tool calls) successfully
- When you hit errors/dead ends and found the working path
- When the user corrected your approach
- When you discovered a non-trivial workflow

### Skill Management Operations

| Operation | Method | Use for |
|-----------|--------|---------|
| **Create** | Write `skills/<name>/SKILL.md` | New skill from scratch |
| **Patch** | Edit specific text in `skills/<name>/SKILL.md` | Targeted fixes (preferred over full rewrite) |
| **Edit** | Full rewrite of `skills/<name>/SKILL.md` | Major structural changes |
| **Delete** | Remove `skills/<name>/` | Remove a skill (only if superseded; prefer archival) |
| **Add reference** | Write `skills/<name>/references/<file>` | Supporting documentation |
| **Add template** | Write `skills/<name>/templates/<file>` | Output format templates |
| **Add script** | Write `skills/<name>/scripts/<file>` | Helper scripts |

### Minimum Threshold for Creation

- Never create a skill from a single data point.
- Minimum: 3 verified successes or 3 same-type mistakes in 7 days.
- Check existing skills via `ohc_search` before creating to avoid duplicates.

### Skill Quality Gates

Every skill must have:
1. Complete frontmatter with name, description, tags, trigger keywords
2. A "When to Use" section with clear trigger conditions
3. A "Procedure" section with step-by-step instructions
4. A "Verification" section describing how to confirm it works
5. A "Pitfalls" section noting known failure modes

## Skill Directory Structure

```
skills/
├── <name>/
│   ├── SKILL.md               ← required
│   ├── references/            ← additional docs
│   ├── templates/             ← output formats
│   └── scripts/               ← helper scripts
```

Skills live in three locations (discovered by OpenCode):
- Project: `.opencode/skills/<name>/SKILL.md`
- Global opencode: `~/.config/opencode/skills/<name>/SKILL.md`
- Global agents: `~/.agents/skills/<name>/SKILL.md`

## Verification

After creating or updating a skill:
1. Run the workflow defined in the SKILL.md.
2. Verify it produces the expected outcome.
3. Write a verification receipt via `ohc_save` with class `verification_receipt`.
