<p align="center">
  <h1 align="center">&#9764; OpenHermes</h1>
  <p align="center"><i>The Constitutional Router for <a href="https://opencode.ai">OpenCode</a></i></p>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/openhermes"><img src="https://img.shields.io/npm/v/openhermes?style=for-the-badge&label=version&color=FFD700" alt="npm version"></a>
  <a href="https://github.com/nathwn12/openhermes/blob/master/LICENSE"><img src="https://img.shields.io/badge/license-MIT-green?style=for-the-badge" alt="License: MIT"></a>
  <a href="https://opencode.ai"><img src="https://img.shields.io/badge/runs%20on-OpenCode-6366f1?style=for-the-badge" alt="Runs on OpenCode"></a>
  <a href="https://github.com/nathwn12/openhermes/issues"><img src="https://img.shields.io/badge/issues-welcome-orange?style=for-the-badge" alt="Issues welcome"></a>
</p>

---

**Your OpenCode agent, leveled up.** Add it to your plugins and your agent gains a personality, a memory, a conscience, 25 specialist subagents, 26 slash commands, 5 native memory tools, 10 procedural skills, autonomous checkpointing, and the discipline to self-improve.

```bash
npm i openhermes
```

---

> &#9764; **Inspired by [Hermes Agent](https://github.com/NousResearch/hermes-agent)** — Nous Research's self-improving agent that brought closed learning loops, skill creation, and cross-session memory to the agent ecosystem. OpenHermes reimagines that vision **native to the OpenCode platform**: zero dependencies, no sidecars, no installers. Your entire agent OS in a single npm package.
>
> **Pruning inspiration**: The autonomous context-pressure system is heavily inspired by [Opencode-DCP (Dynamic Context Pruning)](https://github.com/Opencode-DCP/opencode-dynamic-context-pruning). The curator plugin's compaction-trigger logic and recall-cache freshness model are direct ports of DCP's approach, adapted to run inside OpenHermes with no sidecars or installers.
>
> **Subagent & command expansion**: The 18 language-specialist subagents and 19 orchestration commands are adapted from [Everything Claude Code (ECC)](https://github.com/everything-claude-code/ecc) — an open-source OpenCode plugin system.

---

## What OpenHermes Does For Your Agent

<table>
<tr><td width="160"><b>&#129302; Personality Layer</b></td><td>An 11-principle constitution (<code>soul.md</code>) injected into every session — pragmatic, concise, subagent-first, verify-don't-claim. Your agent stops rambling and starts delivering.</td></tr>
<tr><td><b>&#128204; Delegation Discipline</b></td><td>Mandated routing table — every non-trivial task goes to the right specialist subagent. Main context stays clean, coordination-only. No more bloated chat logs.</td></tr>
<tr><td><b>&#128190; 9-Class Durable Memory</b></td><td>Checkpoints, decisions, constraints, instincts, mistakes, backlog items, audit reports, verification receipts, and session recall — all schema-validated, fingerprint-aware, persisted to disk.</td></tr>
<tr><td><b>&#129520; Precision-First Retrieval</b></td><td>Gated retrieval with anti-spam controls. <code>hm_latest</code> → <code>hm_search</code> → <code>hm_get</code> → <code>hm_list</code>. No full-index reads unless explicitly scoped. Memory stays lean.</td></tr>
<tr><td><b>&#128293; Autonomous Checkpointing</b></td><td>Pre-compaction snapshots capture mission, current state, next actions, blockers, and risk notes so compaction never loses the plot.</td></tr>
<tr><td><b>&#128260; Closed Learning Loop</b></td><td>Mistakes are logged with root cause + prevention rule. Complex sessions auto-generate skill-candidate backlogs. Strike tracking escalates repeat failures. The agent gets better — you don't have to teach it twice.</td></tr>
<tr><td><b>&#128736; 10 Bundled Procedural Skills</b></td><td>Pre-built skills for API design, backend patterns, coding standards, E2E testing, frontend patterns, frontend slides, security reviews, strategic compaction, TDD workflow, and verification loops. Discovered automatically — use <code>skill</code> to list and load.</td></tr>
<tr><td><b>&#128270; Context Pruner</b></td><td>Agent-controlled compression via <code>ohc.json</code> (soft defaults) + <code>compress</code> tool with <code>targetTokens</code> override. No token claims — reports message count only. Recommend <code>compaction.auto: false</code> to prevent double pruning with OpenCode's built-in system.</td></tr>
<tr><td><b>&#129513; Zero Infrastructure</b></td><td>No Python. No uv. No Docker. No PostgreSQL. No gateway. No cron daemon. Just Node.js and your existing OpenCode runtime.</td></tr>
</table>

---

## Setup

Add one line to your `opencode.json`. Two good options:

### Published Release

Use npm when you want a stable release boundary.

```json
{
  "plugin": ["openhermes"]
}
```

### Git-Backed

Use GitHub when you want the latest pushed changes immediately.

```json
{
  "plugin": ["openhermes@git+https://github.com/nathwn12/openhermes.git"]
}
```

Either way, **no other config needed.** The plugin auto-registers:

| What | Details |
|------|---------|
| **25 subagents** | 7 core + 18 specialist:<br>**Core:** architect, planner, build-error-resolver, code-reviewer, security-reviewer, e2e-runner, explore<br>**Specialist:** tdd-guide, docs-lookup, doc-updater, refactor-cleaner, loop-operator, harness-optimizer, review-go, build-go, review-rust, build-rust, review-python, review-java, build-java, review-kotlin, build-kotlin, review-cpp, build-cpp, review-database |
| **27 slash commands** | `/plan`, `/build-fix`, `/code-review`, `/security`, `/doctor`, `/memory-search`, `/learn`, `/ohc`, `/orchestrate`, `/eval`, `/model-route`, `/quality-gate`, `/test-coverage`, `/update-docs`, `/update-codemaps`, `/refactor-clean`, `/verify`, `/checkpoint`, `/loop-start`, `/loop-status`, `/harness-audit`, `/setup-pm`, `/go-build`, `/go-review`, `/rust-build`, `/rust-review`, `/skill-create`, `/update-me` |
| **5 native memory tools** | `hm_put`, `hm_get`, `hm_list`, `hm_latest`, `hm_search` — in-process, no MCP server needed |
| **10 procedural skills** | API design, backend patterns, coding standards, E2E testing, frontend patterns, frontend slides, security review, strategic compaction, TDD workflow, verification loop |
| **6 lifecycle plugins** | bootstrap, curator, autorecall, skill-builder, memory-tools, ohc |

You only need to define primary agents (like `build` or `OpenHermes`) in `opencode.json` — subagents are injected automatically.

> **🔄 Force update / repair:** Run `/update-me` anytime to clear the cached OpenHermes and reload from source. Works with both git-backed and npm installs. Use when the plugin feels stale, broken, or you just pushed changes upstream.

<details>
<summary><b>What happens on your next session</b></summary>

1. **Config hook** — BootstrapPlugin registers auto-config: 25 subagents, 27 commands, 10 skill dirs.
2. **Chat transform hook** — bootstrap content is injected into the first user message:
   - &#9733; **Constitution** (`soul.md`) — 11 immutable principles
   - &#9733; **Runtime** (`RUNTIME.md`) — gather → delegate → verify → compress
   - &#9733; **Router** (`AGENTS.md`) — delegation table, memory policy, escalation, and rule paths
3. **Session created** — AutorecallPlugin builds recall cache from prior session memory.
4. **Tools execute** — SkillBuilderPlugin watches tool calls and subagent spawns; MemoryToolsPlugin provides 5 native tools immediately.
5. **Session idle** — CuratorPlugin snapshots checkpoint + verification receipt.
6. **Session error** — CuratorPlugin logs mistake with root cause + prevention rule.
7. **Compaction** — CuratorPlugin force-writes a pre-compaction checkpoint and injects state into the compaction buffer.

The LLM reads rules on demand via the injected paths. Memory directories auto-create. Everything Just Works.

</details>

---

## Context Pruner (OHC)

### Required: disable OpenCode's built-in compaction

Add to your `opencode.json` to prevent double pruning:

```json
{
  "compaction": {
    "auto": false
  }
}
```

See [OpenCode compaction docs](https://opencode.ai/docs/config/#compaction).

### Configure OHC

Config lives at `~/.config/opencode/ohc.json` — auto-generated with defaults on first load if missing:

```json
{
  "enabled": true,
  "max": 200000,
  "min": 50000
}
```

| Field | Default | Job |
|-------|---------|-----|
| `enabled` | `true` | Master switch |
| `max` | `200000` | Advisory prune threshold (soft — agent can override) |
| `min` | `50000` | Advisory token floor (soft — agent can override via `targetTokens`) |

Values are **soft defaults** — the agent has full control. When the user asks "compress to X", pass `targetTokens` to the `compress` tool.

System prompt is injected with your budget and floor. As context grows, progressive nudges appear at 70%, 85%, and 95% urging proactive compression. Use `/ohc compress [focus]` or call the `compress` tool to free space on demand.

**Commands:**
- `/ohc status` — show current context usage
- `/ohc compress [targetTokens] [focus]` — queue compression with optional numeric target

**Compress tool:** LLM-available. Call `compress` with a technical summary and optional `targetTokens` (lower = more aggressive). Token counts are rough estimates — the tool reports message count removed, not token savings.

---

## The Seven Plugins

### BootstrapPlugin
_Registers agents, commands, skills at config hook; injects constitution + router + runtime into every session._
- **Hooks:** `config`, `chat.transform`
- Registers 25 subagents, 27 commands, 10 skill paths

### MemoryToolsPlugin
_Provides 5 native memory tools — no MCP server, no network, no sidecars._
- Registers `hm_put`, `hm_get`, `hm_list`, `hm_latest`, `hm_search`

### CuratorPlugin
_Snapshots state, logs mistakes, records decisions — the agent's durable memory layer._
- **Hooks:** `session.idle`, `.error`, `.compacted`, `.compacting`, `permission.replied`
- Writes checkpoints, logs mistakes with root cause + prevention, records audits, injects state into compaction

### AutorecallPlugin
_Loads prior session memory into recall cache at startup._
- **Hooks:** `session.created`
- Builds recall cache from disk, aggregates active state for compaction injection

### SkillBuilderPlugin
_Auto-detects complex sessions and creates skill-candidate backlogs._
- **Hooks:** `session.created`, `session.idle`, `tool.execute.after`
- Tracks tool call count and subagent spawns per session; flags sessions exceeding threshold (8+ tool calls or 2+ subagent spawns)

### OhcPlugin
_Silent config-driven context pruner. No tool calls, no chat output, no toasts._
- **Hooks:** `config`, `experimental.chat.system.transform`, `.messages.transform`, `command.execute.before`, `tool.compress`
- Injects context budget via system prompt; progressive nudges at 70%/85%/95%; silent reaper enforces hard limit; `/ohc` command + `compress` tool for on-demand pruning

### UpdaterPlugin
_Force-update / repair command for OpenHermes itself._
- **Hooks:** `command.execute.before`
- Registers `/update-me` — detects install method (git or npm), clears stale cache, tells user to restart. Safe to run anytime.

---

## Memory Architecture

Nine schema-validated classes across two dimensions — what the record is and where it lives.

### Classes

| Class | Format | Layer | Purpose |
|-------|--------|-------|---------|
| `checkpoint` | JSON | 🧠 State | Pre-compaction snapshots: mission, state, next actions, blockers |
| `constraint` | JSON | 🧠 State | Hard limits, env realities, safety rules |
| `decision` | JSON | 🧠 State | Durable project choices shaping all future behavior |
| `instinct` | JSON | 📈 Learning | Reusable trigger→action patterns with hit tracking |
| `backlog` | JSON | 📈 Learning | Evidence-backed self-improvement items with acceptance criteria |
| `mistake` | JSONL | 📈 Learning | Failure registry: type, root cause, fix, prevention, strike count |
| `audit` | JSON | ✅ Integrity | Structured quality evaluations with health scores |
| `verification_receipt` | JSON | ✅ Integrity | Cached verification results keyed by artifact fingerprint |
| `recall` | JSON | ✅ Integrity | Session-start cache for compaction buffer injection |

### Storage

| What | Where |
|------|-------|
| OHC config | `~/.config/opencode/ohc.json` |
| Durable memory + runtime state | `~/.local/share/opencode/openhermes/` |
| Derived recall cache | `~/.cache/opencode/openhermes/recall/` |

### Hardening

Every record is scrubbed before persistence: `sanitizeRecord()` strips proto-poison (`__proto__`, `constructor`, `prototype`), `redactSensitiveText()` strips bearer tokens / API keys / passwords, `truncateText()` caps field sizes. Schema validation runs before every write.

---

## Session Lifecycle

A session runs through three phases. Six plugins coordinate across 20+ OpenCode hooks — no polling, no cron, no sidecars.

**▶️ Warmup — one-shot, session start**
```
config hook          BootstrapPlugin registers harness/skills/, skills auto-discover
session.created      BootstrapPlugin injects constitution ▸ router ▸ runtime
                     AutorecallPlugin loads disk memory → writes recall cache
                     SkillBuilderPlugin resets counters
```

**⚙️ Execution — per tool call, per subagent spawn**
```
tool.execute.*       SkillBuilderPlugin counts calls + spawns
```

**⏹️ Cooldown — auto-triggered by OpenCode lifecycle**
```
session.idle          CuratorPlugin: checkpoint snapshot + verification receipt
                      SkillBuilderPlugin: complexity check → backlog candidate

session.compacting    CuratorPlugin: force-writes pre-compaction checkpoint
                      Injects harness state + recall context → compaction buffer

session.compacted     CuratorPlugin: updates loop-state to "compacted"

session.error         CuratorPlugin: logs mistake (type, root cause, fix, prevention)

permission.replied    CuratorPlugin: writes audit record for every permission decision
```

---

## Verification Discipline

One core habit — **verify before claiming success.**

| Rule | Why |
|------|-----|
| 🕵️ Read before editing | Don't fix what you haven't seen |
| 🧪 Run before announcing | Don't claim what you haven't tested |
| 🧬 Cache by fingerprint | Same file, same receipt — skip re-verify |
| 🔄 Re-verify on change | Stale receipt is worse than no receipt |
| 🚩 Flag contradictions | Silence is consent to bugs |

Verification receipts are a first-class memory type — keyed by artifact identity + fingerprint (path, mtime, hash). When the artifact is unchanged, the cached receipt suffices. When the artifact changes, re-verify. This is not an afterthought — it's the difference between "I think it works" and "I know it works."

---

## Bundled Harness

The full operational doctrine ships inside the package. Six directories, zero dependencies outside Node.js.

| Directory | What it contains | Why it matters |
|-----------|-----------------|----------------|
| `constitution/` | `soul.md` — 11 immutable principles | Your agent's personality, frozen |
| `instructions/` | Runtime workflow + coding conventions | The playbook every session runs on |
| `rules/` | 16 files: retrieval, verification, audit, self-heal, delegation, ... | The legal framework — no ambiguity |
| `skills/` | 10 procedural SKILL.md files | Domain expertise discovered automatically |
| `prompts/` | 25 subagent prompt templates | Language specialists, docs lookup, loop drivers — all on tap |
| `commands/` | 26 slash command templates | From `/verify` to `/review-go` — full toolbelt |

OpenHermes is not a runtime shim. The doctrine ships with the package — every subagent and every command follows the same constitution, rules, and conventions.

---

## Self-Healing Escalation

A mistake is not a failure — it's a signal. OpenHermes escalates through four tiers before it ever reaches you.

```
T0 ── Any mistake
     Observe → log mistake record → smallest safe correction → verify

T1 ── Same mistake repeats within 7 days
     Add prevention rule → targeted verification

T2 ── Prevention failed / systemic issue
     Delegate to specialist → deep audit → backlog item

T3 ── Cascading failures
     Constrained safe mode: narrow claims, preserve receipts, produce handoff
```

No self-termination. No grandstanding. Narrow, log, recover, improve. The agent gets better — you don't have to teach it twice.

---

## Environment Variables

Two knobs. That's it.

| Variable | Default | Effect |
|----------|---------|--------|
| `OPENCODE_ALLOW_PROJECT_HARNESS` | `false` | Enable project-local harness at `.opencode/openhermes/` |
| `OPENCODE_CURATOR_LOGS` | `false` | Pipe curator diagnostics to stderr for debugging |

---

## Architecture

Three layers. All ES modules. One runtime dependency.

```
openhermes/
│
├── ⚡ index.mjs              # Plugin exports (all 5)
├── ⚡ bootstrap.mjs          # Config hook + chat.transform
├── ⚡ autorecall.mjs         # Memory → recall cache
├── ⚡ curator.mjs            # Lifecycle hooks engine
├── ⚡ skill-builder.mjs      # Complexity detection
│
├── ⚡ lib/
│   ├── memory-tools-plugin.mjs   # 5 hm_* tools
│   ├── hardening.mjs             # sanitize, redact, atomic write
│   ├── paths.mjs                 # storage root resolver
│   ├── schema-validator.mjs      # Draft-07 validation
│   └── ohc/                      # context pruner
│
├── ⚡ schemas/               # 9 Draft-07 memory schemas
│
├── 📦 harness/
│   ├── constitution/         # soul.md — 11 principles
│   ├── instructions/         # runtime + conventions
│   ├── rules/                # 16 files
│   ├── skills/               # 10 procedural skills
│   ├── prompts/              # 25 subagent templates
│   └── commands/             # 26 slash command templates
│
└── 📦 package.json           # one dependency: @opencode-ai/plugin
```

**Dependency footprint:** `@opencode-ai/plugin` only. No postinstall scripts. No native compilation. No Docker. No Python. Your entire agent OS in a single `npm install`.

---

## Why OpenHermes ≠ Hermes Agent

Same messenger emoji. Entirely different mediums.

| | Hermes Agent | OpenHermes |
|-|------------|------------|
| Platform | Standalone agent — TUI + gateway + cron | OpenCode-native plugin — lives *inside* your editor |
| Installation | Python 3.11 + uv + 30+ deps — 5-15 min | `npm i` — 3 seconds |
| Infrastructure | Long-running gateway, cron daemon, 20 platform adapters, 7 terminal backends, SQLite+FTS5 | Zero sidecars — everything is a plugin hook |
| Memory | MEMORY.md + USER.md files + optional Honcho | 9-class schema-validated memory with in-process tools |
| Skills | agentskills.io standard, auto-creation + self-improvement | SKILL.md progressive disclosure, auto-detected |
| Context | Context files + FTS5 search + LLM summarization | Harness injection at startup, recall cache at compaction |
| Philosophy | "The self-improving agent" — feature-rich, platform-expansive | "The constitutional router" — discipline-first, precision-only |

Both are &#9764; messengers. Different mediums.

---

## Contributing

Problems, ideas, improvements? [Open an issue](https://github.com/nathwn12/openhermes/issues). PRs welcome.

---

## License

MIT — see [LICENSE](LICENSE).

<p align="center">
  <sub><b>&#9764;</b> Built with discipline. Inspired by <a href="https://github.com/NousResearch/hermes-agent">Hermes Agent</a>, <a href="https://github.com/everything-claude-code/ecc">Everything Claude Code</a>, and <a href="https://github.com/Opencode-DCP/opencode-dynamic-context-pruning">Dynamic Context Pruning</a>. Built for <a href="https://opencode.ai">OpenCode</a>.</sub>
</p>
