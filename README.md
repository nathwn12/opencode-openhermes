# openhermes-opencode

OpenHermes plugin suite for [OpenCode](https://opencode.ai) — full constitutional router: personality injection, delegation rules, precision-first memory, 10 procedural skills, autonomous checkpointing, and self-improvement loops.

One install, full experience.

```bash
npm i openhermes-opencode
```

## What it does

OpenHermes is a thin constitutional router that ships as a single npm package. Drop it into your `opencode.json` and your agent gets a personality layer, mandated delegation rules, memory gating, skill discovery, session checkpointing, and mistake logging — all in one shot.

### Four plugins, one package

| Plugin | Hook | What it does |
|--------|------|-------------|
| **BootstrapPlugin** | `config`, `experimental.chat.messages.transform` | Registers 10 harness skills for discovery. Injects constitution (soul.md), runtime workflow (RUNTIME.md), and the full AGENTS.md router — with real file paths to every rules file — into every session's first user message. |
| **CuratorPlugin** | `session.idle`, `session.compacted`, `session.error`, `permission.replied`, `experimental.session.compacting` | Writes checkpoints on idle, logs mistakes on error, records permission audits, injects harness state into compaction buffers |
| **AutorecallPlugin** | `session.created` | Loads memory from disk (constraints, decisions, mistakes, checkpoints, backlog) and writes a recall cache for injection at compaction |
| **SkillBuilderPlugin** | `session.idle`, `session.created`, `tool.execute.after` | Detects complex sessions (>=8 tool calls or >=2 subagent spawns) and creates skill-candidate backlog entries |

### Memory classes

OpenHermes persists 9 memory classes to `~/.config/opencode/openhermes/memory/`:

| Class | Storage | Purpose |
|-------|---------|---------|
| `checkpoint` | JSON | Bridges volatile context and durable state before compaction |
| `constraint` | JSON | Hard limits, env realities, safety rules |
| `decision` | JSON | Durable choices that shape future behavior |
| `instinct` | JSON | Reusable proven patterns with success/failure tracking |
| `backlog` | JSON | Evidence-backed self-improvement items |
| `mistake` | JSONL | Failure memory with root cause, fix, and prevention |
| `verification_receipt` | JSON | Cached verification results keyed by fingerprint |
| `audit` | JSON | Structured quality/integrity evaluations |
| `recall` | JSON | Session-start recall cache for compaction injection |

## Setup

Add to your `opencode.json`:

```json
{
  "plugins": ["openhermes-opencode"]
}
```

That's it. OpenCode's Bun auto-installer handles the rest. Memory directories are created on first write. The bootstrap plugin auto-registers the 10 bundled skills and injects the full constitutional router into every session.

### What gets injected

On session start, the BootstrapPlugin prepends ~12K chars of context to the first user message:

1. **Constitution** (`soul.md`) — 11 immutable personality principles (pragmatic, concise, subagent-first, verify-don't-claim, etc.)
2. **Runtime** (`RUNTIME.md`) — session workflow: gather → delegate → verify → compress
3. **Router** (AGENTS.md) — delegation table, memory policy (precision-first, gated), self-edit authority, escalation tiers, skill catalog — with absolute paths to every rules file in the harness

The LLM reads rules on demand via `read` tool using the injected paths. All 10 OpenHermes procedural skills are discoverable via OpenCode's native `skill` tool.

### Bundled harness

The full OpenHermes harness ships inside the package at `harness/`:

| Directory | Contents |
|-----------|----------|
| `constitution/` | `soul.md` — immutable personality core |
| `instructions/` | `RUNTIME.md` — session workflow |
| `rules/` | 14 operating rules: `delegation.md`, `retrieval.md`, `self-heal.md`, `verification.md`, `memory-management.md`, `precedence.md`, `checkpointing.md`, `audit.md`, `skills-management.md`, `context-loading.md`, `promotion.md`, `ranking.md`, `runtime-guards.md`, `state-drift.md` |
| `skills/` | 10 procedural skills with SKILL.md: `api-design`, `backend-patterns`, `coding-standards`, `e2e-testing`, `frontend-patterns`, `frontend-slides`, `security-review`, `strategic-compact`, `tdd-workflow`, `verification-loop` |
| `prompts/` | 7 subagent prompt templates: `architect`, `build-error-resolver`, `code-reviewer`, `e2e-runner`, `explore`, `planner`, `security-reviewer` |
| `commands/` | 7 slash command templates: `build-fix`, `code-review`, `doctor`, `learn`, `memory-search`, `plan`, `security` |

### Dependencies

- **Node.js >= 18** (uses `node:path`, `node:fs`, `node:os`, `node:url`)
- **OpenCode** runtime (Bun-based plugin loader)
- `@opencode-ai/plugin` is listed as an optional peer dependency — not required at runtime but some tooling may use it

## Environment

| Variable | Default | Effect |
|----------|---------|--------|
| `OPENCODE_ALLOW_PROJECT_HARNESS` | `false` | Enable project-local harness at `.opencode/openhermes/` instead of global |
| `OPENCODE_CURATOR_LOGS` | `false` | Enable curator diagnostic output to stderr |

## Architecture

```
openhermes-opencode/
├── index.mjs                 # Re-exports all four plugins
├── bootstrap.mjs             # Config hook (skill paths) + chat.transform hook (context injection)
├── autorecall.mjs            # Session-start memory loader + recall cache writer
├── curator.mjs               # Session lifecycle hooks, checkpoint/mistake/audit/receipt persist
├── skill-builder.mjs         # Complexity detection -> backlog entries
├── lib/
│   ├── hardening.mjs         # atomicWriteJson, fingerprintEnvironment, sanitizeRecord, truncateText
│   └── schema-validator.mjs  # Draft-07 subset JSON schema validator
├── schemas/                  # 9 JSON Schema (Draft-07) files bundled as fallback
│   ├── audit.schema.json
│   ├── backlog.schema.json
│   ├── checkpoint.schema.json
│   ├── constraint.schema.json
│   ├── decision.schema.json
│   ├── instinct.schema.json
│   ├── loop-state.schema.json
│   ├── mistake.schema.json
│   └── verification_receipt.schema.json
├── harness/                  # Full OpenHermes harness (shipped in package)
│   ├── constitution/soul.md
│   ├── instructions/RUNTIME.md
│   ├── rules/ (14 .md files)
│   ├── skills/ (10 directories with SKILL.md)
│   ├── prompts/ (7 subagent templates)
│   └── commands/ (7 slash command templates)
└── package.json
```

## How it works

### Session lifecycle

```
session.startup (config hook)
  → BootstrapPlugin registers harness/skills/ path
  → OpenCode discovers 10 procedural skills

session.created (chat.transform hook)
  → BootstrapPlugin injects constitution + router + runtime into first user message
  → AutorecallPlugin loads memory, writes recall cache
  → SkillBuilderPlugin resets session stats

...tools execute...
  → SkillBuilderPlugin counts tool calls and subagent spawns

session.idle
  → CuratorPlugin writes checkpoint + verification receipt
  → SkillBuilderPlugin checks complexity thresholds, creates backlog entry if needed

session.compacted
  → CuratorPlugin updates loop-state to "compacted"

experimental.session.compacting
  → CuratorPlugin force-writes pre-compaction checkpoint
  → Injects harness state + recall context into compaction buffer

session.error
  → CuratorPlugin logs mistake to mistakes.jsonl
  → Updates loop-state with error status

permission.replied
  → CuratorPlugin writes audit record for permission decisions
```

### Schema validation

All records are validated against their JSON Schema (Draft-07 subset) before persistence. The bundled `schema-validator.mjs` supports:
- `type`, `const`, `enum`, `format`, `minimum`, `maximum`
- `required`, `properties`, `items`
- `"type": ["string", "null"]` for nullable fields

Records that fail validation are logged (if curator logs enabled) and skipped.

### Hardening

`lib/hardening.mjs` provides:
- **atomicWriteJson** — atomic JSON serialization with background flush
- **fingerprintEnvironment** — SHA-256 fingerprint of cwd + harness root + project + session
- **fingerprintFile** — SHA-256 of file content (size + mtime + content hash)
- **redactSensitiveText** — strips bearer tokens, api keys, passwords from text
- **sanitizeRecord** — strips `__proto__`, `constructor`, `prototype` and truncates long strings
- **truncateText** — cuts text to a max length with awareness markers

## License

MIT
