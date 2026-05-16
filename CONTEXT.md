# OpenHermes — Shared Language

## Terms
**OpenHermes** — OpenCode-native orchestration layer for this package.
**Skill** — A `SKILL.md` loaded on demand through OpenCode's skill tool.
**Command** — A slash command backed by package-local markdown in `harness/commands/`.
**Agent** — A primary or subagent definition loaded through OpenCode config.
**Instruction** — Markdown loaded through `AGENTS.md` or `opencode.json` instructions.
**Bootstrap** — The first-message context injected by the OpenHermes plugin.

### Confidence Gate Terms
**Confidence Gate** — Phase 0.5 protocol in the autopilot loop that evaluates signal strength before routing. Bounded to 1 conversational exchange max.
**Confidence Level** — One of HIGH, MEDIUM, LOW, derived from signal axis evaluation.
**Transparent Gate** — HIGH confidence behavior: zero conversational overhead, proceed directly to Auto-Classify.
**Echo Gate** — MEDIUM confidence behavior: one-liner echo to confirm understanding, then classify.
**Question Gate** — LOW confidence behavior: one targeted question, then classify. Fallback to oh-planner on no answer.
**1 Exchange** — One user response to one orchestrator prompt. The gate is bounded to exactly 0 (HIGH) or 1 (MEDIUM/LOW) exchanges.
**Signal** — Evidence in user input used to evaluate confidence across 6 axes (domain vocabulary, deliverable clarity, scope, ambiguity, file reference, domain count).

## Relationships
- OpenHermes contains many Skills, Commands, Agents, and Instructions.
- Skills are invoked on demand.
- Commands are entry points.
- OpenHermes is the default primary Agent.

## Flagged Ambiguities
- Durable state is deferred for now and not a domain term for this pass.
