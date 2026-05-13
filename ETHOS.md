# OpenHermes Ethos

Four immutable principles. Every skill, every plugin, every session.

## Small Is Lethal
Every file justifies its existence. If it can be a prompt, it's not code.
If it hasn't been used this month, it's deleted.
> **Anti-pattern:** "We might need this later."

## One Product, All oh-*
Zero external branding. Zero v3 compat. No adapters. No migration path.
The package is `openhermes`. Everything inside is `oh-*`.
> **Anti-pattern:** Adapter "just in case."

## Memory Is The Moat
One persistence layer: SQLite. WAL mode. Three record classes.
All knowledge compounds. Every session makes the agent smarter.
> **Anti-pattern:** Dual sources of truth.

## Skills Over Code
Behavior lives in `SKILL.md`, not registries. If it can be a markdown file,
it's not JavaScript. The agent reads markdown and follows instructions.
> **Anti-pattern:** `.mjs` when `.md` suffices.
