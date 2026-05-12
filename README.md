<p align="center">
  <h1 align="center">&#9764; OpenHermes</h1>
  <p align="center"><i>The Constitutional Router for <a href="https://opencode.ai">OpenCode</a></i></p>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/openhermes"><img src="https://img.shields.io/npm/v/openhermes?style=for-the-badge&label=version&color=FFD700" alt="npm version"></a>
  <a href="https://github.com/nathwn12/openhermes/blob/master/LICENSE"><img src="https://img.shields.io/badge/license-MIT-green?style=for-the-badge" alt="License: MIT"></a>
  <a href="https://opencode.ai"><img src="https://img.shields.io/badge/runs%20on-OpenCode-6366f1?style=for-the-badge" alt="Runs on OpenCode"></a>
  <a href="https://github.com/nathwn12/openhermes/issues"><img src="https://img.shields.io/badge/issues-welcome-orange?style=for-the-badge" alt="Issues welcome"></a>
  <a href="#"><img src="https://img.shields.io/badge/tests-176%20passing-22c55e?style=for-the-badge" alt="176 tests passing"></a>
</p>

---

```json
{ "plugin": ["openhermes"] }
```

**One line. Your agent gains a personality, constitution, durable memory, 25 specialist subagents, 29 commands, structured handoff protocol, a multi-stage quality pipeline, and a self-healing escalation system.**

Zero infrastructure. Two npm packages (one is the OpenCode SDK). Your machine already has everything else.

---

## What OpenHermes Does For Your Agent

<table>
<tr><td width="180"><b>&#129302; Constitutional Spine</b></td><td>A 14-principle operating doctrine (<code>CONSTITUTION.md</code>) injected into every session — subagent-driven, verify-don't-claim, receipts over vibes, zero deference to bad ideas. Every session starts with a Tone Check.</td></tr>
<tr><td><b>&#128204; Structured Handoff Protocol</b></td><td>Every agent knows its permission tier and handoff triggers. Review agents never edit. Builders never approve their own work. Security reports only. Tasks are complexity-graded (easy → very-large) and routed to the right specialist automatically.</td></tr>
<tr><td><b>&#128190; SQLite-Backed Durable Memory</b></td><td>9 classes — checkpoints, decisions, constraints, instincts, mistakes, backlog, audits, verification receipts, recall — all schema-validated, fingerprint-aware, and persisted to SQLite via Node.js's built-in <code>node:sqlite</code>. O(log n) queries, concurrent session safe, atomic writes. No separate database process. No Docker. No Python.</td></tr>
<tr><td><b>&#127959; Multi-Stage Quality Pipeline</b></td><td><code>/gauntlet</code> command routes work through sequential specialist reviews: scope check → security audit → code review → quality gate → ship recommendation. Each stage delegates to the right subagent. Mechanical fixes auto-applied. Critical findings block shipment.</td></tr>
<tr><td><b>&#128260; Closed Learning Loop</b></td><td>Mistakes are logged with root cause + prevention rule. Complex sessions auto-generate skill-candidate backlogs. Strike tracking escalates repeat failures into structural fixes. The agent gets better — you don't teach it twice.</td></tr>
<tr><td><b>&#128736; 10 Bundled Procedural Skills</b></td><td>Pre-built skills for API design, backend patterns, coding standards, E2E testing, frontend patterns, frontend slides, security reviews, strategic compaction, TDD workflow, and verification loops. Auto-discovered — use <code>skill</code> to list and load.</td></tr>
<tr><td><b>&#128270; Accurate Context Pruner</b></td><td>BPE tokenizer (cl100k_base via <code>gpt-tokenizer</code>) drives all compression decisions — accurate within ~1%, not the old 30-50% heuristic. Configurable via <code>ohc.json</code> + <code>compress</code> tool. Progressive nudges at 70/85/95%.</td></tr>
<tr><td><b>&#128308; Error Circuit Breakers</b></td><td>Every plugin hook wrapped in try/catch. Non-critical errors logged and swallowed (session events, compaction). Critical errors (message transforms) re-thrown. A <code>_degraded</code> tool surfaces which plugins failed and why. One bad plugin never takes down the system silently.</td></tr>
<tr><td><b>&#129513; Zero Infrastructure</b></td><td>No Python. No uv. No Docker. No PostgreSQL. No gateway. No cron daemon. No MCP server. No separate database. Just Node.js 22+ and your existing OpenCode runtime.</td></tr>
</table>

---

## Agent Handoff Protocol

The reason most agent sessions descend into chaos: every agent thinks it can do everything. OpenHermes fixes that with a **structured handoff system** baked into every subagent prompt.

**Coverage:** All 25 subagents now include standard Permissions and Handoff sections. Each agent knows its tier (1/2/3), what actions it can take, when to delegate, and how to format a handoff request.

**Complexity-gated routing:**

| Level | Criteria | Strategy |
|-------|----------|----------|
| **Easy** | 1-2 files, well-known pattern, single change | Handle directly |
| **Medium** | 3-10 files, new feature, needs exploration | 2-5 subagents, sequential or fan-out |
| **Hard** | 10+ files, cross-cutting change | Sequential: planner → executor → reviewers |
| **Very Large** | 50+ files, massive refactor | Fan-out: split into chunks, parallel, consolidate |

**Permission tiers:**

| Tier | Agents | Can edit? | Can exec? | Can review? |
|------|--------|-----------|-----------|-------------|
| 1 | planners, architects, reviewers, explore | ❌ | ❌ | ✅ |
| 2 | builders, doc-updaters, refactor-cleaners | ✅ | ✅ | ❌ (own work) |
| 3 | primary agent, loop-operator, e2e-runner | ✅ | ✅ | ✅ |

**Built library** — `lib/handoff.mjs` (171 lines, 5 exports): `handoffRequest`, `parseHandoffResult`, `assessComplexity`, `suggestAgent`, `canAgent`. Simple enough to audit. Sophisticated enough to govern 25 agents.

---

## Setup

Add one line to your `opencode.json`:

### Published Release (stable)
```json
{ "plugin": ["openhermes"] }
```

### Git-Backed (latest pushed changes)
```json
{ "plugin": ["openhermes@git+https://github.com/nathwn12/openhermes.git"] }
```

Either way, **no other config needed.** The plugin auto-registers:

| What | Details |
|------|---------|
| **25 subagents** | 7 core (architect, planner, build-error-resolver, code-reviewer, security-reviewer, e2e-runner, explore) + 18 specialist (pipeline-orchestrator, tdd-guide, docs-lookup, doc-updater, refactor-cleaner, loop-operator, harness-optimizer, 9 language-specific build/review pairs, review-database) |
| **29 slash commands** | `/build-fix`, `/checkpoint`, `/code-review`, `/doctor`, `/eval`, `/gauntlet`, `/go-build`, `/go-review`, `/harness-audit`, `/learn`, `/loop-start`, `/loop-status`, `/memory-search`, `/model-route`, `/ohc`, `/orchestrate`, `/plan`, `/quality-gate`, `/refactor-clean`, `/rust-build`, `/rust-review`, `/security`, `/setup-pm`, `/skill-create`, `/test-coverage`, `/update-codemaps`, `/update-docs`, `/update-me`, `/verify` |
| **6 native memory tools** | `ohc_save`, `ohc_get`, `ohc_list`, `ohc_latest`, `ohc_search`, `ohc_archive` — in-process, no MCP server |
| **10 procedural skills** | API design, backend patterns, coding standards, E2E testing, frontend patterns, frontend slides, security review, strategic compaction, TDD workflow, verification loop |
| **6 lifecycle plugins** | bootstrap, curator, autorecall, skill-builder, memory-tools, ohc |

> **&#128260; Force update:** Run `/update-me` anytime to clear stale cache and reload from source. Works with both git-backed and npm installs.

<details>
<summary><b>What happens on your next session</b></summary>

1. **Config hook** — BootstrapPlugin registers 25 subagents, 29 commands, 10 skill paths
2. **Chat transform** — Constitution + Runtime + Router injected into first user message
3. **Session created** — AutorecallPlugin builds recall cache from prior session memory; memory migrates from JSON to SQLite automatically
4. **Tools execute** — SkillBuilderPlugin watches calls; MemoryToolsPlugin provides 6 native tools immediately — all backed by SQLite
5. **Session idle** — CuratorPlugin snapshots checkpoint + verification receipt
6. **Session error** — CuratorPlugin logs mistake with root cause + prevention rule
7. **Compaction** — CuratorPlugin force-writes pre-compaction checkpoint and injects state into compaction buffer
8. **Quality gate** — Run `/gauntlet` to route work through scope → security → review → quality → report stages

No polling. No cron. Six plugins, 20+ hooks, one runtime.
</details>

---

## The Dependency Story

**Two packages. One is the OpenCode SDK. The other is a pure-JS tokenizer.**

| Package | Type | Native deps? | Size |
|---------|------|-------------|------|
| `@opencode-ai/plugin` | OpenCode SDK | No | Tiny |
| `gpt-tokenizer` | BPE tokenizer (cl100k_base) | **No** — pure JS | Lightweight |

**Everything else is already on your machine:**

| What | Where it comes from |
|------|-------------------|
| **SQLite** | Node.js 22+ built-in (`node:sqlite`). If you run OpenCode (Bun/Node), you have it. Zero install. Zero config. |
| **JSON Schema Draft-07** | Custom validator — 23 keywords, recursion guard, zero dependencies |
| **Logging** | `lib/logger.mjs` — ~40 lines, zero dependencies, log levels via `OPENCODE_LOG_LEVEL` |
| **Memory store** | `lib/memory-store.mjs` — wraps `node:sqlite`, zero dependencies |

> OpenCode runs on Bun, which bundles Node.js. If you can run OpenCode, you can run OpenHermes. No apt-get. No brew install. No Docker pull.

---

## Memory Architecture

Nine schema-validated classes. All stored in a single SQLite database (`~/.local/share/opencode/openhermes/memory.db`). No more `index.json` files. No more O(n) scans. No more JSONL corruption risk.

| Class | Purpose |
|-------|---------|
| `checkpoint` | Pre-compaction snapshots: mission, state, next actions, blockers |
| `constraint` | Hard limits, env realities, safety rules |
| `decision` | Durable project choices shaping all future behavior |
| `instinct` | Reusable trigger→action patterns with hit tracking |
| `backlog` | Evidence-backed self-improvement items with acceptance criteria |
| `mistake` | Failure registry: type, root cause, fix, prevention, strike count |
| `audit` | Structured quality evaluations with health scores |
| `verification_receipt` | Cached verification results keyed by artifact fingerprint |
| `recall` | Session-start cache for compaction buffer injection |

**Storage paths:**
- `~/.local/share/opencode/openhermes/memory.db` — single SQLite database (replaces 200+ individual JSON files)
- `~/.cache/opencode/openhermes/recall/` — derived cache
- `~/.config/opencode/ohc.json` — pruner config

**Why SQLite:**
- O(log n) queries instead of O(n) index.json scans
- Concurrent session safe (WAL mode)
- Atomic transactions — no partial writes
- Automatic migration from old JSON format on first use

**Retrieval ladder:** `ohc_latest` → `ohc_search` → `ohc_get` → `ohc_list`. Anti-spam: no obvious facts, no one-off prefs, no low-risk mistakes.

**Hardening:** Every record is sanitized, redacted, truncated, and validated before write. Proto-poison (`__proto__`, `constructor`, `prototype`) stripped. Bearer tokens / API keys / passwords redacted. Fields capped by schema limits. Full Draft-07 validation on write.

---

## `/gauntlet` — Multi-Stage Quality Pipeline

Inspired by GStack's autoplan. Routes work through sequential specialist reviews, each producing structured findings. Mechanical fixes auto-applied. Critical findings block shipment.

| Stage | Agent | Weight | What It Checks |
|-------|-------|--------|----------------|
| scope | code-reviewer | 20% | Diff matches intent, no scope drift |
| security | security-reviewer | **35%** | OWASP Top 10, injection, XSS, auth flaws, secrets |
| review | code-reviewer | 25% | Code quality, architecture, DRY, edge cases |
| quality | tdd-guide | 20% | Test coverage, lint, dead code |
| report | (self) | 0% | Weighted score + ship/review/block recommendation |

**Quality scoring:** Weighted average of stage scores. Critical finding → score 0.0 (block). High → max 0.3. Clean → 1.0. Overall ≥ 0.9 = ship, ≥ 0.7 = review, < 0.7 = block.

```
/gauntlet                          # Full 5-stage pipeline
/gauntlet --stages security        # Security-only quick check
/gauntlet --stages security,review --auto-fix
/gauntlet --skip quality           # Bypass quality gate
```

---

## Self-Healing Escalation

A mistake is not a failure — it's a signal. OpenHermes escalates through four tiers before it ever reaches you.

```
T0 ── Any mistake
      Observe → log mistake record → smallest safe correction → verify

T1 ── Same mistake repeats within 7 days
      Add prevention rule → targeted verification

T2 ── Prevention failed / systemic issue
      Delegate to specialist → deep audit → backlog item → structural fix

T3 ── Cascading failures
      Constrained safe mode: narrow claims, preserve receipts, produce handoff
```

No self-termination. No grandstanding. The agent gets better — you don't teach it twice.

---

## Error Resilience — Circuit Breakers

Every plugin hook is individually wrapped with appropriate error handling. Non-critical hooks (session events, compaction, tool execute) log and recover silently. Critical hooks (message transforms, config) re-throw so OpenCode can surface the error.

A `_degraded` tool surfaces plugin health at any time:

```
> Plugin Health:
>   No degraded plugins
```

If a plugin factory fails (disk error, corrupt config, network issue), only that plugin degrades — the other 7 continue running. The `_degraded` tool tells you exactly which plugin failed and why.

---

## Session Lifecycle

Three phases. Six plugins coordinate across 20+ OpenCode hooks.

```
▶️  Warmup
    config hook          BootstrapPlugin registers harness/skills/, skills auto-discover
    session.created      BootstrapPlugin injects constitution → router → runtime
                         AutorecallPlugin loads disk memory → writes recall cache
                         SkillBuilderPlugin resets counters

⚙️  Execution
    tool.execute.*       SkillBuilderPlugin counts calls + spawns

⏹️  Cooldown
    session.idle         CuratorPlugin: checkpoint snapshot + verification receipt
                         SkillBuilderPlugin: complexity check → backlog candidate
    session.compacting   CuratorPlugin: force-writes pre-compaction checkpoint
                         Injects harness state + recall context → compaction buffer
    session.compacted    CuratorPlugin: updates loop-state to "compacted"
    session.error        CuratorPlugin: logs mistake (type, root cause, fix, prevention)
    permission.replied   CuratorPlugin: writes audit record for every permission decision
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

Verification receipts are a first-class memory type — keyed by artifact identity + fingerprint (path, mtime, hash). This is not an afterthought. It's the difference between "I think it works" and "I know it works."

---

## Bundled Harness

The full operational doctrine ships inside the package. Six directories, zero dependencies outside Node.js.

| Directory | Contents | Purpose |
|-----------|----------|---------|
| `codex/` | `CONSTITUTION.md` — 14 immutable principles | Your agent's behavior, frozen per session |
| `instructions/` | Runtime workflow + coding conventions | The playbook every session runs on |
| `rules/` | 17 files: retrieval, verification, audit, self-heal, delegation, handoff | The legal framework — no ambiguity |
| `skills/` | 10 procedural SKILL.md files | Domain expertise discovered automatically |
| `prompts/` | 25 subagent prompt templates | Language specialists, docs lookup, loop drivers — all on tap |
| `commands/` | 27 slash command templates | From `/verify` to `/gauntlet` — full toolbelt |

OpenHermes is not a runtime shim. The doctrine ships with the package — every subagent and every command follows the same constitution, rules, and conventions.

---

## The Six Plugins

| Plugin | Hook Points | Job |
|--------|-------------|-----|
| **Bootstrap** | `config`, `chat.transform` | Registers agents/commands/skills; injects constitution + router + runtime |
| **MemoryTools** | (tool registration) | Provides 6 `ohc_*` tools — all backed by SQLite, no MCP server, no network |
| **Curator** | `session.idle`, `.error`, `.compacted`, `.compacting`, `permission.replied` | Snapshots state, logs mistakes, records decisions, injects into compaction |
| **Autorecall** | `session.created` | Loads prior session memory into recall cache at startup |
| **SkillBuilder** | `session.created`, `.idle`, `tool.execute.after` | Auto-detects complex sessions → backlog candidates |
| **OhcPlugin** | `config`, all transform/command hooks | BPE-accurate context pruner; progressive nudges; `/ohc` command + `compress` tool |

---

## Architecture

```
openhermes/
│
├── ⚡ index.mjs               # Entry point — merges 8 plugins with circuit breakers
├── ⚡ bootstrap.mjs           # Config hook + chat.transform + harness resolution
├── ⚡ autorecall.mjs          # Memory → recall cache
├── ⚡ curator.mjs             # Lifecycle hooks engine (concurrent-session safe)
├── ⚡ skill-builder.mjs       # Complexity detection
│
├── ⚡ lib/
│   ├── memory-store.mjs           # SQLite-backed store (node:sqlite)
│   ├── memory-tools-plugin.mjs    # 6 ohc_* tools on SQLite
│   ├── pipeline.mjs               # /gauntlet pipeline engine
│   ├── logger.mjs                 # Structured logging (levels, colors)
│   ├── handoff.mjs                # Delegation protocol
│   ├── hardening.mjs              # sanitize, redact, atomic write
│   ├── paths.mjs                  # storage root resolver + memory.db path
│   ├── schema-validator.mjs       # Full Draft-07 (23 keywords, recursion guard)
│   └── ohc/                       # BPE-accurate context pruner
│       ├── tokenizer.mjs          # cl100k_base BPE wrapper
│       ├── pruner.mjs             # Main pruner with circuit breakers
│       └── ...                    # config, state, reaper, strategies, compress
│
├── ⚡ schemas/                # 9 Draft-07 memory schemas
│
├── 📦 harness/
│   ├── codex/                 # CONSTITUTION.md
│   ├── instructions/          # runtime + conventions
│   ├── rules/                 # 17 operational doctrine files
│   ├── skills/                # 10 procedural skills
│   ├── prompts/               # 25 subagent templates
│   └── commands/              # 27 slash command templates
│
└── 📦 package.json            # 2 dependencies: @opencode-ai/plugin + gpt-tokenizer
```

---

## Why OpenHermes ≠ Hermes Agent

Same messenger emoji. Entirely different mediums.

| | Hermes Agent | OpenHermes |
|-|------------|------------|
| Platform | Standalone agent — TUI + gateway + cron | OpenCode-native plugin — lives *inside* your editor |
| Installation | Python 3.11 + uv + 30+ deps — 5-15 min | `npm i` — 3 seconds |
| Infrastructure | Long-running gateway, cron daemon, 20 platform adapters, 7 terminal backends, SQLite+FTS5 | Zero sidecars — everything is a plugin hook. SQLite via Node.js built-in |
| Memory | MEMORY.md + USER.md files + optional Honcho | 9-class SQLite-backed, schema-validated, fingerprint-aware, concurrent-safe |
| Skills | agentskills.io standard, auto-creation + self-improvement | SKILL.md progressive disclosure, auto-detected |
| Subagents | N/A | 25 specialists + pipeline orchestrator with handoff protocol, permission tiers, phase management |
| Testing | 85 tests | **176 tests** — 2x coverage |
| Philosophy | "The self-improving agent" — feature-rich, platform-expansive | **"The constitutional router"** — discipline-first, precision-only |

Both are &#9764; messengers. Different mediums.

---

## Contributing

Problems, ideas, improvements? [Open an issue](https://github.com/nathwn12/openhermes/issues). PRs welcome.

CI runs on push/PR to master (Node 22/24 matrix, coverage report).

---

## License

MIT — see [LICENSE](LICENSE). All credited inspirations are independent implementations — no code copied. ECC and Hermes Agent are MIT. DCP is AGPL-3.0 but shared concepts (compress, dedup, purge) are uncopyrightable ideas (17 U.S.C. § 102(b); *Computer Assocs. v. Altai*, 982 F.2d 693). AGPL copyleft requires copying or adapting the work (§ 0) — independent implementation does not trigger it.

<p align="center">
  <sub><b>&#9764;</b> Built with discipline. Inspired by <a href="https://github.com/NousResearch/hermes-agent">Hermes Agent</a> (MIT), <a href="https://github.com/affaan-m/everything-claude-code">ECC</a> (MIT), and <a href="https://github.com/Opencode-DCP/opencode-dynamic-context-pruning">DCP</a> (AGPL-3.0). Built for <a href="https://opencode.ai">OpenCode</a>.</sub>
</p>
