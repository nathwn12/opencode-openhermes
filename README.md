<p align="center">
  <h1 align="center">&#9764; OpenHermes</h1>
  <p align="center"><i>The Constitutional Router for <a href="https://opencode.ai">OpenCode</a></i></p>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/openhermes"><img src="https://img.shields.io/npm/v/openhermes?style=for-the-badge&label=version&color=FFD700" alt="npm version"></a>
  <a href="https://github.com/nathwn12/openhermes/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-green?style=for-the-badge" alt="License: MIT"></a>
  <a href="https://opencode.ai"><img src="https://img.shields.io/badge/runs%20on-OpenCode-6366f1?style=for-the-badge" alt="Runs on OpenCode"></a>
  <a href="https://github.com/nathwn12/openhermes/issues"><img src="https://img.shields.io/badge/issues-welcome-orange?style=for-the-badge" alt="Issues welcome"></a>
</p>

---

**Your OpenCode agent, leveled up.** Add it to your plugins — your agent gains a personality, a memory, a conscience, 7 specialist subagents, 7 slash commands, 5 native memory tools, 10 procedural skills, and the discipline to self-improve.

```bash
npm i openhermes
```

---

> &#9764; **Inspired by [Hermes Agent](https://github.com/NousResearch/hermes-agent)** — Nous Research's self-improving agent that brought closed learning loops, skill creation, and cross-session memory to the agent ecosystem. OpenHermes reimagines that vision **native to the OpenCode platform**: zero dependencies, no sidecars, no installers. Your entire agent OS in a single npm package.
>
> **Pruning inspiration**: The autonomous context-pressure system is heavily inspired by [Opencode-DCP (Dynamic Context Pruning)](https://github.com/Opencode-DCP/opencode-dynamic-context-pruning). The curator plugin's compaction-trigger logic and recall-cache freshness model are direct ports of DCP's approach, adapted to run inside OpenHermes with no sidecars or installers.

---

## What OpenHermes Does For Your Agent

<table>
<tr><td width="160"><b>&#129302; Personality Layer</b></td><td>A 11-principle constitution (soul.md) injected into every session — pragmatic, concise, subagent-first, verify-don't-claim. Your agent stops rambling and starts delivering.</td></tr>
<tr><td><b>&#128204; Delegation Discipline</b></td><td>Mandated routing table — every non-trivial task goes to the right specialist subagent. Main context stays clean, coordination-only. No more bloated chat logs.</td></tr>
<tr><td><b>&#128190; 9-Class Durable Memory</b></td><td>Checkpoints, decisions, constraints, instincts, mistakes, backlog items, audit reports, verification receipts, and session recall — all schema-validated, fingerprint-verified, persisted to disk.</td></tr>
<tr><td><b>&#129520; Precision-First Retrieval</b></td><td>Gated retrieval with anti-spam controls. <code>hm_latest</code> → <code>hm_search</code> → <code>hm_get</code> → <code>hm_list</code>. No full-index reads unless explicitly scoped. Memory stays lean.</td></tr>
<tr><td><b>&#128293; Autonomous Checkpointing</b></td><td>Pre-compaction snapshots capture mission, current state, next actions, active decisions, blockers, and risk notes — so compaction never loses the plot.</td></tr>
<tr><td><b>&#128260; Closed Learning Loop</b></td><td>Mistakes are logged with root cause + prevention rule. Complex sessions auto-generate skill-candidate backlogs. Strike tracking escalates repeat failures. The agent gets better — you don't have to teach it twice.</td></tr>
<tr><td><b>&#128736; 10 Bundled Procedural Skills</b></td><td>Pre-built skills for API design, backend patterns, coding standards, E2E testing, frontend patterns, security reviews, strategic compaction, TDD workflow, verification loops, and presentation building. Discovered automatically — use <code>skill</code> tool to list and load.</td></tr>
<tr><td><b>&#129513; Zero Infrastructure</b></td><td>No Python. No uv. No Docker. No PostgreSQL. No gateway. No cron daemon. Just Node.js — which OpenCode's Bun runtime already bundles. Everything runs inside your existing OpenCode session.</td></tr>
</table>

---

## Setup

Add one line to your `opencode.json`:

```json
{
  "plugin": ["openhermes"]
}
```

That's it. **No other config needed.** The plugin auto-registers:

| What | Details |
|------|---------|
| **7 subagents** | `architect`, `planner`, `code-reviewer`, `security-reviewer`, `build-error-resolver`, `e2e-runner`, `explore` |
| **7 slash commands** | `/plan`, `/build-fix`, `/code-review`, `/security`, `/doctor`, `/memory-search`, `/learn` |
| **5 native memory tools** | `hm_put`, `hm_get`, `hm_list`, `hm_latest`, `hm_search` — in-process, no MCP server needed |
| **10 procedural skills** | API design, backend patterns, coding standards, E2E testing, frontend patterns, frontend slides, security review, strategic compaction, TDD workflow, verification loop |
| **5 lifecycle plugins** | bootstrap, curator, autorecall, skill-builder, memory-tools |

You only need to define primary agents (like `build` or `OpenHermes`) in `opencode.json` — subagents are injected automatically.

<details>
<summary><b>What happens on your next session</b></summary>

1. **Config hook** — BootstrapPlugin registers auto-config: 7 subagents, 7 commands, 10 skill dirs.
2. **Chat transform hook** — ~12KB of context injected into the first user message:
   - &#9733; **Constitution** (soul.md) — 11 immutable principles
   - &#9733; **Runtime** (RUNTIME.md) — gather → delegate → verify → compress
   - &#9733; **Router** (AGENTS.md) — delegation table, memory policy, escalation, with absolute paths to every rule
3. **Session created** — AutorecallPlugin builds recall cache from prior session memory
4. **Tools execute** — SkillBuilderPlugin watches tool calls and subagent spawns; MemoryToolsPlugin provides 5 native tools immediately
5. **Session idle** — CuratorPlugin snapshots checkpoint + verification receipt
6. **Session error** — CuratorPlugin logs mistake with root cause + prevention rule
7. **Compaction** — CuratorPlugin force-writes pre-compaction checkpoint, injects state into buffer

The LLM reads rules on demand via the injected paths. Memory directories auto-create. Everything Just Works™.

</details>

---

## The Five Plugins

| Plugin | Triggers On | What It Does |
|--------|------------|--------------|
| **BootstrapPlugin** | `config`, `chat.transform` | Registers 7 subagents, 7 commands, 10 skill paths. Injects constitution + router + runtime. |
| **MemoryToolsPlugin** | — | Registers 5 native tools: `hm_put`, `hm_get`, `hm_list`, `hm_latest`, `hm_search`. Runs in-process — no MCP server needed. |
| **CuratorPlugin** | `session.idle`, `.compacted`, `.error`, `.compacting`, `permission.replied` | Writes checkpoints, logs mistakes, records audits, injects state into compaction. |
| **AutorecallPlugin** | `session.created` | Loads memory from disk, builds session recall cache. |
| **SkillBuilderPlugin** | `session.idle`, `.created`, `tool.execute.after` | Detects complex sessions (8+ tool calls or 2+ subagent spawns) → creates skill-candidate backlogs. |

---

## Memory Architecture

Nine memory classes, all schema-validated before persistence, stored at `~/.local/share/opencode/openhermes/memory/`:

| Class | Format | Purpose |
|-------|--------|---------|
| `checkpoint` | JSON | Pre-compaction snapshots: mission, current state, next actions, blockers |
| `constraint` | JSON | Hard limits, env realities, safety rules — enforced by precedence engine |
| `decision` | JSON | Durable project choices — shapes all future behavior |
| `instinct` | JSON | Reusable trigger→action patterns with success/failure tracking |
| `backlog` | JSON | Evidence-backed self-improvement items with acceptance criteria |
| `mistake` | JSONL | Failure registry: type, root cause, fix, prevention rule, strike count |
| `audit` | JSON | Structured quality/integrity evaluations with health scores |
| `verification_receipt` | JSON | Cached verification results keyed by artifact fingerprint |
| `recall` | JSON | Session-start cache aggregating active state for compaction injection |

OpenHermes follows the same storage contract as OpenCode itself — see [OpenCode docs on storage](https://opencode.ai/docs/troubleshooting/#storage):

| What | Where |
|---|---|
| Config (schemas, archive) | `~/.config/opencode/openhermes/` |
| Durable memory + runtime state | `~/.local/share/opencode/openhermes/` |
| Derived recall cache | `~/.cache/opencode/openhermes/recall/` |

**Runtime hardening**: All records pass through `sanitizeRecord()` (strips `__proto__`, `constructor`, `prototype`), `redactSensitiveText()` (strips bearer tokens, API keys, passwords), and `truncateText()` before persistence. Schema validation gate runs before every write.

---

## Session Lifecycle

```
session.startup  (config hook)
  │  BootstrapPlugin registers harness/skills/
  │  OpenCode discovers 10 procedural skills
  ▼
session.created  (chat.transform + session.created hooks)
  │  BootstrapPlugin injects constitution ▸ router ▸ runtime
  │  AutorecallPlugin loads memory → writes recall cache
  │  SkillBuilderPlugin resets session counters
  ▼
tools execute...
  │  SkillBuilderPlugin counts tool calls + subagent spawns
  ▼
session.idle
  │  CuratorPlugin snapshots checkpoint + verification receipt
  │  SkillBuilderPlugin checks complexity → backlog entry if threshold met
  ▼
session.compacted
  │  CuratorPlugin updates loop-state → "compacted"
  ▼
experimental.session.compacting
  │  CuratorPlugin force-writes pre-compaction checkpoint
  │  Injects harness state + recall context → compaction buffer
  ▼
session.error
  │  CuratorPlugin logs mistake (type, root cause, fix, prevention, strike)
  │  Updates loop-state with error status
  ▼
permission.replied
  │  CuratorPlugin writes audit record for every permission decision
```

---

## Bundled Harness

The full OpenHermes framework ships inside the package — 60 files across 6 directories:

```
harness/
├── constitution/soul.md        # 11 immutable personality principles
├── instructions/RUNTIME.md      # Session workflow: gather → delegate → verify
├── rules/ (16 files)
│   ├── delegation.md            # Mandatory subagent routing
│   ├── retrieval.md             # Gated precision-first memory retrieval
│   ├── session-start.md         # Session-start checklist and memory hydration
│   ├── credential-exposure.md   # Secret redaction and credential exposure guard
│   ├── self-heal.md             # T0→T3 escalation tiers
│   ├── verification.md          # Skeptical evidence protocol
│   ├── memory-management.md     # Dual-target memory + anti-spam
│   ├── precedence.md            # 9-level conflict resolution
│   ├── checkpointing.md         # Compaction snapshot discipline
│   ├── audit.md                 # Structured health checks
│   ├── skills-management.md     # Progressive disclosure loading
│   ├── context-loading.md       # Priority chain + size limits
│   ├── promotion.md             # High-signal-only promotion
│   ├── ranking.md               # Metadata-first retrieval
│   ├── runtime-guards.md        # Stale assumption prevention
│   └── state-drift.md           # Hash-based fingerprinting
├── skills/ (10 directories)
│   ├── api-design/SKILL.md          # REST API patterns (523 lines)
│   ├── backend-patterns/SKILL.md    # Backend architecture (598 lines)
│   ├── coding-standards/SKILL.md    # Baseline conventions (549 lines)
│   ├── e2e-testing/SKILL.md         # Playwright E2E patterns (326 lines)
│   ├── frontend-patterns/SKILL.md   # React/Next.js patterns (642 lines)
│   ├── frontend-slides/SKILL.md     # HTML presentation builder (184 lines)
│   ├── security-review/SKILL.md     # OWASP Top 10 checklist (495 lines)
│   ├── strategic-compact/SKILL.md   # Context compaction strategy (131 lines)
│   ├── tdd-workflow/SKILL.md        # Red-green-refactor discipline (463 lines)
│   └── verification-loop/SKILL.md   # Pre-PR quality gates (126 lines)
├── prompts/ (7 files)
│   # Subagent prompt templates: architect, build-error-resolver,
│   # code-reviewer, e2e-runner, explore, planner, security-reviewer
└── commands/ (7 files)
    # Slash command templates: build-fix, code-review, doctor,
    # learn, memory-search, plan, security
```

---

## Self-Healing Escalation

When your agent makes a mistake, OpenHermes doesn't just log it — it escalates:

| Tier | Trigger | Action |
|------|---------|--------|
| **T0** | Any mistake | Observe → log mistake record → smallest safe correction → verify |
| **T1** | Same mistake repeats within 7 days | Add prevention rule → targeted verification |
| **T2** | Prevention failed / systemic issue | Delegate to specialist → audit → backlog item |
| **T3** | Cascading failures | Constrained safe mode: narrow claims, preserve receipts, produce handoff |

No self-termination. No grandstanding. Narrow, log, recover, improve.

---

## Environment Variables

| Variable | Default | Effect |
|----------|---------|--------|
| `OPENCODE_ALLOW_PROJECT_HARNESS` | `false` | Use project-local harness at `.opencode/openhermes/` |
| `OPENCODE_CURATOR_LOGS` | `false` | Enable curator diagnostic output to stderr |

---

## Architecture

```
openhermes/
├── index.mjs                 # Re-exports all 5 plugins
├── bootstrap.mjs             # Config hook (agents/commands/skills) + chat.transform
├── autorecall.mjs            # Recall cache builder
├── curator.mjs               # Lifecycle hooks engine (~470 lines)
├── skill-builder.mjs         # Complexity detection engine
├── lib/
│   ├── memory-tools-plugin.mjs  # 5 native memory tools (hm_put/get/list/latest/search)
│   ├── hardening.mjs            # atomicWriteJson, fingerprint, sanitize, redact
│   └── schema-validator.mjs     # Draft-07 subset validator
├── schemas/                  # 9 JSON schemas for memory validation
├── harness/                  # Full framework (44 files)
└── package.json
```

**Minimal npm dependency footprint.** Tool definitions use OpenCode's tiny `@opencode-ai/plugin` SDK. No postinstall scripts. No native compilation.

---

## Dependencies

- **Node.js >= 18** — `node:path`, `node:fs`, `node:os`, `node:url`, `node:crypto`
- **OpenCode** — provides the Bun runtime, plugin loader, hook dispatcher, and `skill` tool

---

## Why OpenHermes ≠ Hermes Agent

| | Hermes Agent | OpenHermes |
|--|------------|------------|
| **Platform** | Standalone agent with custom TUI, multi-platform gateway, cron scheduler | OpenCode-native plugin — runs *inside* your existing setup |
| **Installation** | `curl | bash` + Python 3.11 + uv + Docker (optional) + PostgreSQL (optional) | `npm i` — that's it |
| **Infrastructure** | Sidecar processes, gateway daemon, FTS5 database, Honcho user modeling | Zero sidecars — everything is a plugin hook |
| **Memory** | Honcho dialectic user profiles + skills system | Schema-validated 9-class memory + in-process native tools |
| **Skills** | Agentskills.io standard, self-created + improving | SKILL.md progressive disclosure, skill-builder auto-detection |
| **Context** | Context files + session search with LLM summarization | Harness injection at session start, recall cache at compaction |
| **Philosophy** | "The self-improving agent" — feature-rich, platform-expansive | "The constitutional router" — discipline-first, precision-only |

Both are &#9764; messengers. Different mediums.

---

## Contributing

Problems, ideas, improvements? [Open an issue](https://github.com/nathwn12/openhermes/issues). PRs welcome.

---

## License

MIT — see [LICENSE](LICENSE).

<p align="center">
  <sub><b>&#9764;</b> Built with discipline. Inspired by <a href="https://github.com/NousResearch/hermes-agent">Hermes Agent</a>. Built for <a href="https://opencode.ai">OpenCode</a>.</sub>
</p>
