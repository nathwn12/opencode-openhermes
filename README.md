<p align="center">
  <h1 align="center">&#9764; OpenHermes v4</h1>
  <p align="center"><i>The Orchestrator — self-improving agent that gets smarter every session.</i></p>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/openhermes"><img src="https://img.shields.io/npm/v/openhermes?style=for-the-badge&label=version&color=FFD700" alt="npm version"></a>
  <a href="https://github.com/nathwn12/openhermes/blob/master/LICENSE"><img src="https://img.shields.io/badge/license-MIT-green?style=for-the-badge" alt="License: MIT"></a>
  <a href="https://opencode.ai"><img src="https://img.shields.io/badge/runs%20on-OpenCode-6366f1?style=for-the-badge" alt="Runs on OpenCode"></a>
</p>

---

OpenHermes turns OpenCode into an autonomous engineering agent. One plugin entry, zero runtime deps.

```json
{ "plugin": ["openhermes"] }
```

**What you get:**

| Capability | What it does |
|------------|--------------|
| **26 skills** | Load-on-demand expertise — planning, review, QA, ship, investigate, triage, TDD, architect, retro, caveman mode, and more |
| **SQLite memory** | 8 record classes (checkpoint, mistake, decision, audit, constraint, backlog, instinct, verification_receipt). Persists across sessions and context resets |
| **Ambient context injection** | Every message gets a `<OPENHERMES_MEMORY>` block with current checkpoint, mission, next actions, active constraints, recent decisions, backlog count. No manual recall needed |
| **Auto-retrieval** | When you ask "where were we?" or similar, it searches SQLite and injects relevant records as `<memory-context>` — zero-effort recall |
| **Memory tool** | Agent can `save` and `query` records directly via a registered tool |
| **Compaction hook** | When OpenCode compacts context, saves a checkpoint + re-injects recent state so context carries through |
| **Autorecall** | On session start, writes a recall cache so the agent can see what happened before |
| **Constitution** | 4 principles injected on every session: pragmatic, concise, task-focused, subagent-first |
| **Skills sync** | Auto-copies skill files from harness to `~/.config/opencode/skills/` on install |

**For v3 users:** v4 is a ground-up rebuild. Same SQLite memory file. Zero runtime deps. ~60% less code.

---

## Install

```bash
npm install openhermes@latest
```

### Git-backed installs (advanced)

Pins to the latest commit on the default branch (always the most recent code):

```json
{ "plugin": ["openhermes@git+https://github.com/nathwn12/openhermes.git"] }
```

<details>
<summary><code>v3-legacy</code> — unsupported (click to expand)</summary>

**Warning:** v3 is no longer maintained. No patches, no support. Use only if pinned to a v3 workflow.

```json
{ "plugin": ["openhermes@git+https://github.com/nathwn12/openhermes.git#v3-legacy"] }
```

</details>

<details>
<summary><code>dev</code> — experimental (click to expand)</summary>

**Warning:** Dev branch may be unstable, breaking, or ahead of the published npm release. Not for production use.

```json
{ "plugin": ["openhermes@git+https://github.com/nathwn12/openhermes.git#dev"] }
```

</details>

## Reference

<details>
<summary>Full glossary — commands, skills, memory, internals (click to expand)</summary>

### Commands

| Command | Source | Description |
|---------|--------|-------------|
| `/oh-doctor` | external skill (`opencode-doctor`) | 10 health checks: store, DB integrity, skills linked, config valid, storage, cache, logs, WAL mode, OpenCode version, auth.json |

### Skills (26)

Loaded via `skill` tool. Listed automatically via `oh-skills-list`.

| Skill | Description |
|-------|-------------|
| `oh-architect` | Codebase health analysis — find deepening opportunities for improvement |
| `oh-autoplan` | Run all reviews sequentially with auto-decisions using 6 decision principles |
| `oh-brainstorm` | Product idea exploration — YC Office Hours style |
| `oh-canary` | Post-deploy verification — monitor for errors and regressions |
| `oh-caveman` | Ultra-compressed communication mode — cut token usage ~75% |
| `oh-context-restore` | Restore a previously saved session context |
| `oh-context-save` | Bookmark session state so it can be resumed later |
| `oh-freeze` | Restrict file edits to a specific directory for the session |
| `oh-grill` | Stress-test a plan or design through relentless questioning |
| `oh-grill-with-docs` | Stress-test a plan while building CONTEXT.md and ADRs inline |
| `oh-guard` | Safety confirmation mode — warn before destructive operations |
| `oh-handoff` | Compact session state into a structured handoff document |
| `oh-init` | Per-repo initialisation — CONTEXT.md, AGENTS.md, docs/adr/ scaffold |
| `oh-investigate` | Systematic bug diagnosis with root cause investigation |
| `oh-issue` | Break a plan, spec, or PRD into independently-grabbable GitHub issues |
| `oh-learn` | Review, search, prune, and export session learnings |
| `oh-plan` | Strategy + architecture review chain for planning complex features |
| `oh-prd` | Turn conversation context into a PRD and publish as GitHub issue |
| `oh-proto` | Quick throwaway prototype to flesh out a design |
| `oh-qa` | Full QA workflow — systematic testing with iterative fix-verify cycles |
| `oh-retro` | Weekly engineering retrospective — analyze commit history and work patterns |
| `oh-review` | Code and design review for pre-landing quality gate |
| `oh-ship` | Deploy and PR pipeline — test, bump, changelog, PR, deploy, verify |
| `oh-skills-link` | Link skills from harness to agent config global path |
| `oh-skills-list` | List all available oh-* skills with descriptions |
| `oh-triage` | Issue triage state machine — classify, prioritise, assign |

### Plugins (4)

Loaded on every session. All in `index.mjs:8-14`.

| Plugin | File | Hooks | What it does |
|--------|------|-------|-------------|
| **Bootstrap** | `bootstrap.mjs` | `config`, `experimental.chat.messages.transform` | Syncs skills to `~/.config/opencode/skills/`. Registers skills path in config. Injects constitution + runtime + ethos into first user message each session |
| **Curator** | `curator.mjs` | `experimental.session.compacting` | When OpenCode compacts context, saves a checkpoint to SQLite and re-injects recent state (last checkpoint, decision, mistake) |
| **AmbientMemory** | `lib/ambient-memory.mjs` | `experimental.chat.messages.transform` | Injects `<OPENHERMES_MEMORY>` block into every user message. Detects memory queries ("where were we?") and auto-retrieves matching SQLite records as `<memory-context>` |
| **MemoryTool** | `lib/memory-tool.mjs` | `tool` | Registers a `memory` tool the agent can call to `save` or `query` records in SQLite |

### Auto-loaded modules

| Module | File | Trigger | What it does |
|--------|------|---------|-------------|
| **Autorecall** | `autorecall.mjs` | `session.created` event | Writes recall cache to `~/.cache/opencode/openhermes/recall/cache.json` so agent can see prior session state |

### Memory classes (8)

All stored in a single SQLite table `memory_records` at `~/.local/share/opencode/openhermes/memory.db`.

| Class | Agent-writable? | Used by | Purpose |
|-------|----------------|---------|---------|
| `checkpoint` | yes | Curator, ambient context | Session state snapshots — saved on compaction, injected on every message |
| `mistake` | yes | AmbientMemory, memory tool | Root-cause records of errors with prevention rules |
| `decision` | yes | AmbientMemory, memory tool | Architectural and process decisions with rationale |
| `audit` | no (internal) | AmbientMemory (read) | Quality gate audit results |
| `constraint` | no (internal) | AmbientMemory (read) | Active constraints injected in memory block |
| `backlog` | no (internal) | AmbientMemory (read) | Open items tracked in memory block |
| `verification_receipt` | no (internal) | AmbientMemory (read) | Proof of verification events |
| `instinct` | no (internal) | AmbientMemory (read) | Pattern-match hunches from prior sessions |

### Internals

| File | Role |
|------|------|
| `lib/memory-store.mjs` | SQLite CRUD — save, get, list, latest, all, query, search |
| `lib/sqlite-adapter.mjs` | SQLite driver (via `@opencode-ai/plugin`) |
| `lib/search.mjs` | Relevance scoring for auto-retrieval |
| `lib/hardening.mjs` | `hasExpired()` and `isTruthy()` helpers |
| `lib/harness-resolver.mjs` | Resolves harness directory path |
| `lib/paths.mjs` | Memory DB path resolution |
| `lib/logger.mjs` | Structured logger |
| `harness/codex/CONSTITUTION.md` | Operating doctrine (4 principles) |
| `harness/instructions/RUNTIME.md` | Runtime workflow instructions |
| `ETHOS.md` | 4 immutable principles (small is lethal, one product all oh-*, memory is the moat, skills over code) |
| `CONTEXT.md` | Shared domain language for the agent |

</details>

## Upgrading from v3

<details>
<summary>v3 → v4 migration (click to expand)</summary>

v4 is a complete rebuild. No backward compat. To migrate your v3 data:

1. Your v3 SQLite database at `~/.local/share/opencode/openhermes/memory.db` is **compatible** — v4 reads the same file. Old `audit`, `backlog`, `constraint`, `instinct`, `verification_receipt` tables sit unused.
2. Skills auto-copy to `~/.config/opencode/skills/`.
3. If you had any custom commands or subagents pointing at the OpenHermes harness, update them for v4 paths.

To clean up v3 artifacts:

```bash
# These are optional — v4 ignores old files
rm -rf ~/.local/share/opencode/openhermes/runtime
```
</details>
