# OpenHermes — Shared Language

## Terms
**OpenHermes** — OpenCode-native orchestration layer for this package.
**Skill** — A `SKILL.md` loaded on demand through OpenCode's skill tool.
**Command** — A slash command backed by package-local markdown in `harness/commands/`.
**Agent** — A primary or subagent definition loaded through OpenCode config.
**Instruction** — Markdown loaded through `AGENTS.md` or `opencode.json` instructions.
**Bootstrap** — The first-message context injected by the OpenHermes plugin.

## Relationships
- OpenHermes contains many Skills, Commands, Agents, and Instructions.
- Skills are invoked on demand.
- Commands are entry points.
- OpenHermes is the default primary Agent.

## Flagged Ambiguities
- Durable state is deferred for now and not a domain term for this pass.
