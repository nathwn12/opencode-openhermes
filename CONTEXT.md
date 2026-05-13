# OpenHermes — Shared Language

## Terms
**oh-*** — Prefix for all OpenHermes skills.
**SKILL.md** — Markdown file with YAML frontmatter defining an agent skill.
**Memory** — SQLite-backed persistence layer (checkpoint, mistake, decision).
**ETHOS.md** — Four immutable principles guiding all decisions.

## Relationships
- OpenHermes contains many oh-* Skills
- Each oh-* Skill has one SKILL.md
- Memory is-kind-of SQLite database

## Flagged Ambiguities
- "backlog" was used for both tool and work → resolved: not used in v4
