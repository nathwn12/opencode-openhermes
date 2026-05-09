# openhermes-opencode

OpenHermes plugin suite for [OpenCode](https://opencode.ai) — autonomous checkpointing, memory recall, skill-candidate detection, and runtime curation.

One install, zero headaches.

```bash
npm i openhermes-opencode
```

## What it does

OpenHermes is a thin constitutional router that runs inside OpenCode as a plugin suite. It gives your OpenCode agent durable memory, session state management, and self-improvement loops.

### Three plugins, one package

| Plugin | Hook | What it does |
|--------|------|-------------|
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

That's it. OpenCode's Bun auto-installer handles the rest. Memory directories are created on first write. If you already have the OpenHermes harness installed, it reads schemas from `~/.config/opencode/openhermes/schemas/` — otherwise it falls back to the bundled schemas in the npm package.

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
├── index.mjs              # Re-exports all three plugins
├── autorecall.mjs         # Session-start memory loader + recall cache writer
├── curator.mjs            # Session lifecycle hooks, checkpoint/mistake/audit/receipt persist
├── skill-builder.mjs      # Complexity detection -> backlog entries
├── lib/
│   ├── hardening.mjs      # atomicWriteJson, fingerprintEnvironment, sanitizeRecord, truncateText
│   └── schema-validator.mjs  # Draft-07 subset JSON schema validator
├── schemas/               # 9 JSON Schema (Draft-07) files bundled as fallback
│   ├── checkpoint.schema.json
│   ├── constraint.schema.json
│   ├── decision.schema.json
│   ├── instinct.schema.json
│   ├── backlog.schema.json
│   ├── mistake.schema.json
│   ├── verification_receipt.schema.json
│   ├── audit.schema.json
│   └── loop-state.schema.json
└── package.json
```

## How it works

### Session lifecycle

```
session.created
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
