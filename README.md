<p align="center">
  <h1 align="center">&#9764; OpenHermes</h1>
  <p align="center"><i>The Constitutional Router for <a href="https://opencode.ai">OpenCode</a></i></p>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/openhermes"><img src="https://img.shields.io/npm/v/openhermes?style=for-the-badge&label=version&color=FFD700" alt="npm version"></a>
  <a href="https://github.com/nathwn12/openhermes/blob/master/LICENSE"><img src="https://img.shields.io/badge/license-MIT-green?style=for-the-badge" alt="License: MIT"></a>
  <a href="https://opencode.ai"><img src="https://img.shields.io/badge/runs%20on-OpenCode-6366f1?style=for-the-badge" alt="Runs on OpenCode"></a>
  <a href="https://github.com/nathwn12/openhermes/issues"><img src="https://img.shields.io/badge/issues-welcome-orange?style=for-the-badge" alt="Issues welcome"></a>
  <a href="#"><img src="https://img.shields.io/badge/tests-219%20passing-22c55e?style=for-the-badge" alt="219 tests passing"></a>
  <a href="#"><img src="https://img.shields.io/badge/coverage-36%20suites-6366f1?style=for-the-badge" alt="36 test suites"></a>
</p>

---

```json
{ "plugin": ["openhermes"] }
```

**One line. Your agent gains a personality, constitution, durable memory, 31 specialist subagents, 22 commands, structured handoff protocol, a multi-stage quality pipeline, and a self-healing escalation system.**

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
<tr><td><b>&#128308; Error Circuit Breakers</b></td><td>Every plugin hook wrapped in try/catch. MemoryStore 8 methods individually guarded — DB corruption won't cascade. Proxy re-entry guards prevent stack overflow (3 flags with try/finally). Unhandled setInterval caught. Notification failures suppressed when client.session unavailable. Non-critical errors logged and swallowed (session events, compaction). A <code>_degraded</code> tool surfaces which plugins failed and why. One bad plugin never takes down the system silently.</td></tr>
<tr><td><b>&#129513; Zero Infrastructure</b></td><td>No Python. No uv. No Docker. No PostgreSQL. No gateway. No cron daemon. No MCP server. No separate database. Just Node.js 22+ and your existing OpenCode runtime.</td></tr>
</table>

---

## Agent Handoff Protocol

The reason most agent sessions descend into chaos: every agent thinks it can do everything. OpenHermes fixes that with a **structured handoff system** baked into every subagent prompt.

**Coverage:** All 31 subagents now include standard Permissions and Handoff sections. Each agent knows its tier (1/2/3), what actions it can take, when to delegate, and how to format a handoff request.

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

**Built library** — `lib/handoff.mjs` (182 lines, 5 exports): `handoffRequest`, `parseHandoffResult`, `assessComplexity`, `suggestAgent`, `canAgent`. Simple enough to audit. Sophisticated enough to govern 31 agents.

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
| **31 subagents** | 7 core (oh-architect, oh-blueprinter, oh-mender, oh-auditor, oh-warden, oh-e2e, oh-explorer) + 24 specialist (oh-gater, oh-prover, oh-scout, oh-scribe, oh-sweeper, oh-pilot, oh-tuner, oh-chronicler, oh-merger, oh-scraper, oh-publisher, oh-sentinel, 9 language-specific build/review pairs, oh-review-db, oh-review-py, oh-build-cpp, oh-build-java, oh-build-go) |
| **22 slash commands** | `/oh-audit`, `/oh-blueprint`, `/oh-browse`, `/oh-doctor`, `/oh-forge`, `/oh-gauntlet`, `/oh-guard`, `/oh-inspect`, `/oh-learn`, `/oh-manifest`, `/oh-mend`, `/oh-pr`, `/oh-recall`, `/oh-scribe`, `/oh-session`, `/oh-ship`, `/oh-sweep`, `/oh-update-me`, `/oh-voyage`, `/oh-weave`, `/ohc` |
| **6 native memory tools** | `ohc_save`, `ohc_get`, `ohc_list`, `ohc_latest`, `ohc_search`, `ohc_archive` — in-process, no MCP server |
| **15 procedural skills** | API design, backend, browser workflow, compact, E2E testing, frontend, PR workflow, prove workflow, safety workflow, session workflow, shield workflow, ship workflow, slides, standards, verify workflow |
| **8 lifecycle plugins** | bootstrap, curator, autorecall, skill-builder, memory-tools, ambient-memory, ohc, updater |

> **&#128260; Force update:** Run `/oh-update-me` anytime to clear stale cache and reload from source. Works with both git-backed and npm installs.

<details>
<summary><b>What happens on your next session</b></summary>

1. **Config hook** — BootstrapPlugin registers 31 subagents, 22 commands, 15 skill paths
2. **Chat transform** — Constitution + Runtime + Router injected into first user message
3. **Session created** — AutorecallPlugin builds recall cache from prior session memory
4. **Tools execute** — SkillBuilderPlugin watches calls; MemoryToolsPlugin provides 6 native tools immediately — all backed by SQLite
5. **Session idle** — CuratorPlugin snapshots checkpoint + verification receipt
6. **Session error** — CuratorPlugin logs mistake with root cause + prevention rule
7. **Compaction** — CuratorPlugin force-writes pre-compaction checkpoint and injects state into compaction buffer
8. **Quality gate** — Run `/oh-gauntlet` to route work through scope → security → review → quality → report stages

No polling. No cron. 8 plugins, 20+ hooks, one runtime.
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
- Legacy JSON storage removed — SQLite-only memory store

**Retrieval ladder:** `ohc_latest` → `ohc_search` → `ohc_get` → `ohc_list`. Anti-spam: no obvious facts, no one-off prefs, no low-risk mistakes.

**Hardening:** Every record is sanitized, redacted, truncated, and validated before write. Proto-poison (`__proto__`, `constructor`, `prototype`) stripped. Bearer tokens / API keys / passwords redacted. Fields capped by schema limits. Full Draft-07 validation on write.

---

## `/oh-gauntlet` — Multi-Stage Quality Pipeline

Inspired by GStack's autoplan. Routes work through sequential specialist reviews, each producing structured findings. Mechanical fixes auto-applied. Critical findings block shipment.

| Stage | Agent | Weight | What It Checks |
|-------|-------|--------|----------------|
| scope | oh-auditor | 20% | Diff matches intent, no scope drift |
| security | oh-warden | **35%** | OWASP Top 10, injection, XSS, auth flaws, secrets |
| review | oh-auditor | 25% | Code quality, architecture, DRY, edge cases |
| quality | oh-prover | 20% | Test coverage, lint, dead code |
| report | (self) | 0% | Weighted score + ship/review/block recommendation |

**Quality scoring:** Weighted average of stage scores. Critical finding → score 0.0 (block). High → max 0.3. Clean → 1.0. Overall ≥ 0.9 = ship, ≥ 0.7 = review, < 0.7 = block.

```
/oh-gauntlet                          # Full 5-stage pipeline
/oh-gauntlet --stages security        # Security-only quick check
/oh-gauntlet --stages security,review --auto-fix
/oh-gauntlet --skip quality           # Bypass quality gate
```

---

## `/oh-manifest` — Full-Stack Manifest Pipeline

Takes a raw idea through a 7-stage pipeline from concept to ship recommendation.

| Stage | Agent | Focus |
|-------|-------|-------|
| clarify | (self) | Interactive Q&A to refine raw idea into structured spec |
| blueprint | oh-blueprinter | Produce detailed implementation plan |
| build | oh-mender | Build the code from the plan |
| audit | oh-auditor | Review code quality, architecture, DRY |
| shield | oh-warden | Security vulnerability detection |
| prove | oh-prover | Test coverage + quality verification |
| report | (self) | Quality score + ship recommendation |

```
/oh-manifest
/oh-manifest --idea "Add a feature to export memory as JSON"
/oh-manifest --stages clarify,blueprint --auto-fix
/oh-manifest --skip shield
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

If a plugin factory fails (disk error, corrupt config, network issue), only that plugin degrades — the other 7 continue running. The `_degraded` tool tells you exactly which plugin failed and why.**

8 plugin factories in `index.mjs`. Each individually wrapped — single failure degrades only that plugin.

---

## Session Lifecycle

Three phases. 8 plugins coordinate across 20+ OpenCode hooks.

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

The full operational doctrine ships inside the package. 6 directories, zero dependencies outside Node.js.

| Directory | Contents | Purpose |
|-----------|----------|---------|
| `codex/` | `CONSTITUTION.md` — 14 immutable principles | Your agent's behavior, frozen per session |
| `instructions/` | Runtime workflow + coding conventions | The playbook every session runs on |
| `rules/` | 17 files: retrieval, verification, audit, self-heal, delegation, handoff | The legal framework — no ambiguity |
| `skills/` | 15 procedural SKILL.md files | Domain expertise discovered automatically |
| `prompts/` | 31 subagent prompt templates | Language specialists, docs lookup, loop drivers — all on tap |
| `commands/` | 20 slash command templates | From `/oh-blueprint` to `/ohc` — full toolbelt |

OpenHermes is not a runtime shim. The doctrine ships with the package — every subagent and every command follows the same constitution, rules, and conventions.

---

## The 8 Plugins

| Plugin | Hook Points | Job |
|--------|-------------|-----|
| Plugin | Hook Points | Job |
|--------|-------------|-----|
| **Bootstrap** | `config`, `chat.messages.transform` | Registers 31 agents, 21 commands, 15 skills, schema validator, handoff protocol. Injects constitution + router + runtime into first user message. |
| **MemoryTools** | (tool registration) | Provides 6 `ohc_*` native memory tools — all SQLite-backed, no MCP server, no network |
| **Curator** | `session.idle`, `.error`, `.compacted`, `.compacting`, `permission.replied` | Snapshots pre-compaction state, logs mistakes with root cause, records decisions, injects harness state into compaction buffer |
| **Autorecall** | `session.created` | Loads prior session memory into recall cache at session start for compaction buffer injection |
| **SkillBuilder** | `session.created`, `.idle`, `tool.execute.after` | Measures session complexity metrics, generates backlog candidates for complex sessions |
| **AmbientMemory** | `chat.messages.transform` | Injects `<OPENHERMES_MEMORY>` context block into first user message |
| **OhcPlugin** | `config`, `chat.messages.transform`, `.system.transform`, `command.execute.before`, (tool) | BPE-accurate context pruner (cl100k_base via gpt-tokenizer). Progressive nudges at 70/85/95%. Configurable via `ohc.json`. |
| **Updater** | `command.execute.before` | Intercepts `/oh-update-me` to force reinstall from latest source |

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
│   ├── skills/                # 15 procedural skills
│   ├── prompts/               # 31 subagent templates
│   └── commands/              # 20 command templates
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
| Subagents | N/A | 31 specialists + pipeline orchestrator with handoff protocol, permission tiers, phase management |
| Testing | 85 tests | **219 tests** — 2.5x coverage |
| Philosophy | "The self-improving agent" — feature-rich, platform-expansive | **"The constitutional router"** — discipline-first, precision-only |

Both are &#9764; messengers. Different mediums.

---

## 📋 Full Reference

<details>
<summary><b>🗂 Commands — 21 slash commands</b></summary>

<br>

| Command | Agent | Description | Flags / Subcommands |
|---------|-------|-------------|---------------------|
| `/oh-audit` | `oh-auditor` | Unified quality and security gateway. Runs code review by default. | `--security` → oh-warden, `--quality` → full pipeline, `--test` → oh-prover, `--verify` → verification loop, `--lang=rust|go|py|java|kotlin|cpp` |
| `/oh-blueprint` | `planner` | Create a detailed implementation plan with risk assessment for a feature or refactor. | `$ARGUMENTS` (free-form description) |
| `/oh-browse` | `oh-scraper` | Persistent Chromium browser automation daemon. Navigate, click, fill, screenshot. | `goto <url>`, `click <selector>`, `fill <selector> <text>`, `screenshot [path]` |
| `/oh-doctor` | `OpenHermes` | Health diagnostics: config, providers, cache, SQLite memory DB, package freshness, credentials. | `--setup-pm`, `--model` |
| `/oh-forge` | `OpenHermes` | Generate SKILL.md files from git history analysis (commit patterns, file clusters, topic modeling). | `$ARGUMENTS` (skill name or topic) |
| `/oh-gauntlet` | `oh-gater` | 5-stage quality pipeline: scope → security → review → quality → report. | `--stages <list>`, `--skip <stage>`, `--auto-fix` |
| `/oh-guard` | `OpenHermes` | Safety mode management. Freeze directories, enable careful mode, guard. | `careful [on|off]`, `freeze <dir>`, `unfreeze <dir>`, `status` |
| `/oh-inspect` | `harness-optimizer` | Self-evaluation audit of the OpenHermes harness. Scores 7 categories. | `[scope]` (repo/hooks/skills/commands/agents), `--format text|json` |
| `/oh-learn` | `OpenHermes` | Create reusable skill from recent work patterns observed in session history. | `$ARGUMENTS` (skill name or pattern) |
| `/oh-manifest` | `oh-gater` | 7-stage pipeline: clarify → blueprint → build → audit → shield → prove → report. | `--idea "..."`, `--stages <list>`, `--skip <stage>`, `--auto-fix` |
| `/oh-mend` | `oh-mender` | Fix build and TypeScript errors with minimal surgical changes. | `--lang=rust|go|cpp|java|kotlin`, `$ARGUMENTS` |
| `/oh-pr` | `oh-merger` | Full PR workflow: create, review, merge, branch management. | `create`, `review`, `merge`, `status` |
| `/oh-recall` | `OpenHermes` | Search SQLite memory with LLM-powered summarization across 9 classes. | `$ARGUMENTS` (search query) |
| `/oh-scribe` | `oh-scribe` | Update docs for recent code changes. Codemaps, README, inline docs. | `--codemap` |
| `/oh-session` | `oh-chronicler` | Cross-session state persistence: save, resume, list, prune. | `save`, `resume <id>`, `list`, `prune [days]` |
| `/oh-ship` | `oh-publisher` | Release pipeline: test → bump → changelog → PR → deploy → verify. | `--dry-run`, `--patch|minor|major` |
| `/oh-sweep` | `refactor-cleaner` | Dead code analysis: unused exports, dead deps, duplicates, cleanup. | `$ARGUMENTS` (scope description) |
| `/oh-update-me` | `OpenHermes` | Force reinstall plugin from latest source. Clears stale cache + lockfile. | No flags |
| `/oh-voyage` | `oh-pilot` | Managed autonomous loop with safety defaults. Iterates until done or blocked. | `--status`, `--stop` |
| `/oh-weave` | `oh-blueprinter` | Orchestrate multiple agents for complex tasks or run evaluations. | `--eval` |
| `/ohc` | `OpenHermes` | OHC context management: monitor tokens, trigger compression. | `status`, `compress [focus]` |

20 command template files in `harness/commands/` + 1 synthetic (`oh-update-me`) = 21 total. Also includes native `compress` tool for AI-triggered compression.

</details>

<details>
<summary><b>🧠 Skills — 15 procedural skills</b></summary>

<br>

| Skill | Triggers / Description | `skill()` |
|-------|----------------------|-----------|
| `oh-api-design` | REST API patterns: resource naming, status codes, pagination, error responses, versioning, rate limiting | `skill("oh-api-design")` |
| `oh-backend` | Backend architecture, Express/Next.js API routes, database optimization, server best practices | `skill("oh-backend")` |
| `oh-browse-workflow` | Browser automation, persistent Chromium daemon, page navigation, form filling, screenshots | `skill("oh-browse-workflow")` |
| `oh-compact` | Strategic context compaction at logical intervals, preserving context through task phases | `skill("oh-compact")` |
| `oh-e2e-workflow` | Playwright E2E testing, Page Object Model, CI/CD artifacts, flaky test strategies | `skill("oh-e2e-workflow")` |
| `oh-frontend` | React/Next.js frontend patterns, state management, performance optimization, UI best practices | `skill("oh-frontend")` |
| `oh-pr-workflow` | PR lifecycle: create, review, merge, PRP patterns, branch management | `skill("oh-pr-workflow")` |
| `oh-prove-workflow` | TDD: red-green-refactor, 80%+ coverage (unit + integration + E2E) | `skill("oh-prove-workflow")` |
| `oh-safety-workflow` | Safety scoping: careful warnings, freeze locks, guard mode with recovery | `skill("oh-safety-workflow")` |
| `oh-session-workflow` | Session management: save, resume, list, prune across sessions | `skill("oh-session-workflow")` |
| `oh-shield-workflow` | Security review: OWASP, injection, XSS, auth flaws, secrets, input validation | `skill("oh-shield-workflow")` |
| `oh-ship-workflow` | Release pipeline: test, bump, changelog, PR, deploy, verify, rollback | `skill("oh-ship-workflow")` |
| `oh-slides` | Create HTML presentations from scratch, convert PPT/PPTX to animation-rich web slides | `skill("oh-slides")` |
| `oh-standards` | Cross-project coding conventions: naming, readability, immutability, code quality | `skill("oh-standards")` |
| `oh-verify-workflow` | Comprehensive verification: pre-checks, post-checks, acceptance criteria | `skill("oh-verify-workflow")` |

15 skill directories in `harness/skills/`. Auto-discovered — use the `skill` tool to list and load any skill by name.

</details>

<details>
<summary><b>🤖 Subagents — 31 specialist agents</b></summary>

<br>

| Tier | Agent | Role | Edit | Exec |
|------|-------|------|------|------|
| 1 | `oh-architect` | System architecture design | ❌ | ❌ |
| 1 | `oh-blueprinter` | Feature/refactor planning | ❌ | ❌ |
| 1 | `oh-auditor` | Code quality review | ❌ | ❌ |
| 1 | `oh-warden` | Security audit (report only) | ❌ | ❌ |
| 1 | `oh-explorer` | Read-only codebase exploration | ❌ | ❌ |
| 1 | `oh-scout` | MCP documentation lookup | ❌ | ✅ |
| 1 | `oh-tuner` | Harness config audit/optimization | ❌ | ✅ |
| 1 | `oh-sentinel` | Safety guard — mode enforcement | ❌ | ❌ |
| 1 | `oh-review-db` | PostgreSQL schema/query review | ❌ | ✅ |
| 1 | `oh-review-go` | Go code review | ❌ | ✅ |
| 1 | `oh-review-java` | Java/Spring review | ❌ | ✅ |
| 1 | `oh-review-kotlin` | Kotlin/Android review | ❌ | ✅ |
| 1 | `oh-review-cpp` | C++ review (memory safety, RAII) | ❌ | ✅ |
| 1 | `oh-review-rust` | Rust review (ownership, lifetimes) | ❌ | ✅ |
| 1 | `oh-review-py` | Python review (PEP 8, typing, security) | ❌ | ✅ |
| 2 | `oh-mender` | Build/type error fixes | ✅ | ✅ |
| 2 | `oh-scribe` | Doc/codemap updates | ✅ | ✅ |
| 2 | `oh-sweeper` | Dead code cleanup | ✅ | ✅ |
| 2 | `oh-prover` | TDD red-green-refactor coach | ✅ | ✅ |
| 2 | `oh-chronicler` | Session state management | ✅ | ✅ |
| 2 | `oh-merger` | PR workflow — commit, merge | ✅ | ✅ |
| 2 | `oh-build-go` | Go build/lint/staticcheck fixes | ✅ | ✅ |
| 2 | `oh-build-java` | Java/Maven/Gradle build fixes | ✅ | ✅ |
| 2 | `oh-build-kotlin` | Kotlin/Gradle build fixes | ✅ | ✅ |
| 2 | `oh-build-cpp` | C++ CMake/linker fixes | ✅ | ✅ |
| 2 | `oh-build-rust` | Rust cargo/borrow-checker fixes | ✅ | ✅ |
| 3 | `oh-pilot` | Managed autonomous loops | ✅ | ✅ |
| 3 | `oh-e2e` | Playwright E2E test runner | ✅ | ✅ |
| 3 | `oh-scraper` | Browser automation daemon | ✅ | ✅ |
| 3 | `oh-publisher` | Release pipeline | ✅ | ✅ |
| 3 | `oh-gater` | Multi-agent pipeline orchestrator | ✅ | ✅ |
| — | `general` | General-purpose multi-step tasks | ✅ | ✅ |

31 prompt files in `harness/prompts/`. Each includes permission tiers, handoff triggers, and structured output contracts.

</details>

<details>
<summary><b>🧠 Memory — 9 schema-validated classes</b></summary>

<br>

SQLite-backed at `~/.local/share/opencode/openhermes/memory.db`. All records schema-validated, sanitized, fingerprinted.

| Class | Purpose | Tools |
|-------|---------|-------|
| `checkpoint` | Pre-compaction snapshots: mission, state, next actions, blockers | `ohc_save("checkpoint", ...)`, `ohc_latest("checkpoint")` |
| `decision` | Durable project choices shaping all future behavior | `ohc_save("decision", ...)`, `ohc_search("decision", "query")` |
| `constraint` | Hard limits, env realities, safety rules | `ohc_save("constraint", ...)` |
| `instinct` | Reusable trigger→action patterns with hit tracking | `ohc_save("instinct", ...)`, `ohc_list("instinct")` |
| `backlog` | Evidence-backed self-improvement items with acceptance criteria | `ohc_save("backlog", ...)` |
| `mistake` | Failure registry: type, root cause, fix, prevention, strike count | `ohc_save("mistake", ...)` |
| `audit` | Structured quality evaluations with health scores | `ohc_save("audit", ...)` |
| `verification_receipt` | Cached verification results keyed by artifact fingerprint | `ohc_save("verification_receipt", ...)` |
| `recall` | Session-start cache for compaction buffer injection | Auto-generated via AutorecallPlugin |

**Retrieval ladder:** `ohc_latest` → `ohc_search` → `ohc_get` → `ohc_list`
**6 native tools:** `ohc_save`, `ohc_get`, `ohc_list`, `ohc_latest`, `ohc_search`, `ohc_archive`

</details>

<details>
<summary><b>🔌 Plugins — 8 lifecycle plugins</b></summary>

<br>

| Plugin | Hook Points | Job |
|--------|-------------|-----|
| **Bootstrap** | `config`, `chat.messages.transform` | Registers 31 agents, 21 commands, 15 skills, schema validator, handoff protocol |
| **MemoryTools** | (tool registration) | 6 native `ohc_*` memory tools — all SQLite-backed |
| **Curator** | `session.idle`, `.error`, `.compacted`, `.compacting`, `permission.replied` | Snapshots state, logs mistakes, records decisions |
| **Autorecall** | `session.created` | Loads prior session memory into recall cache |
| **SkillBuilder** | `session.created`, `.idle`, `tool.execute.after` | Complexity detection → backlog candidates |
| **AmbientMemory** | `chat.messages.transform` | Injects `<OPENHERMES_MEMORY>` context block |
| **OhcPlugin** | `config`, all transform/command hooks, (tool) | BPE-accurate context pruner (cl100k_base) |
| **Updater** | `command.execute.before` | Intercepts `/oh-update-me` for force reinstall |

Each individually wrapped in `index.mjs` — one failure degrades only that plugin.

</details>

<details>
<summary><b>📦 Package structure</b></summary>

<br>

```
openhermes/
│
├── ⚡ index.mjs               # Entry — merges 8 plugins with circuit breakers
├── ⚡ bootstrap.mjs           # Config hook + chat.transform + harness resolution
├── ⚡ autorecall.mjs          # Memory → recall cache
├── ⚡ curator.mjs             # Lifecycle hooks engine
├── ⚡ skill-builder.mjs       # Complexity detection → backlog
│
├── ⚡ lib/
│   ├── memory-store.mjs           # SQLite-backed store (node:sqlite)
│   ├── memory-tools-plugin.mjs    # 6 ohc_* tools
│   ├── pipeline.mjs               # /gauntlet pipeline engine
│   ├── logger.mjs                 # Structured logging
│   ├── handoff.mjs                # Delegation protocol (5 exports)
│   ├── hardening.mjs              # Sanitize, redact, atomic write
│   ├── paths.mjs                  # Storage root resolver
│   ├── schema-validator.mjs       # Full Draft-07 (23 keywords)
│   ├── sqlite-adapter.mjs         # Node/Bun driver adapter
│   ├── goal-tracker.mjs           # PLAN/GOAL/HANDOVER workflow
│   ├── guard-state.mjs            # Safety state machine
│   └── ohc/                       # BPE-accurate context pruner
│       ├── tokenizer.mjs          # cl100k_base BPE wrapper
│       ├── pruner.mjs             # Main pruner + OhcPlugin
│       └── ...
│
├── ⚡ schemas/                # 9 Draft-07 memory schemas
│
├── 📦 harness/
│   ├── codex/                 # CONSTITUTION.md (14 immutable principles)
│   ├── instructions/          # RUNTIME.md + CONVENTIONS.md
│   ├── rules/                 # 17 operational doctrine files
│   ├── skills/                # 15 procedural skills
│   ├── prompts/               # 31 subagent templates
│   └── commands/              # 20 command templates
│
├── ⚡ scripts/
│   ├── smoke-memory-store.mjs # Bun runtime smoke test
│   └── mirror-opencode-config.ps1
│
└── 📦 package.json            # 2 deps: @opencode-ai/plugin + gpt-tokenizer
```

</details>

<details>
<summary><b>📊 Quality pipeline + escalation + testing + config</b></summary>

<br>

### /oh-gauntlet — 5-stage pipeline

| Stage | Agent | Weight | What It Checks |
|-------|-------|--------|----------------|
| scope | oh-auditor | 20% | Diff matches intent, no scope drift |
| security | oh-warden | **35%** | OWASP Top 10, injection, XSS, auth flaws, secrets |
| review | oh-auditor | 25% | Code quality, architecture, DRY, edge cases |
| quality | oh-prover | 20% | Test coverage, lint, dead code |
| report | (self) | 0% | Weighted score + ship/review/block |

≥ 0.9 = **ship**, ≥ 0.7 = **review**, < 0.7 = **block**

### /oh-manifest — 7-stage pipeline

clarify → blueprint → build → audit → shield → prove → report

### Escalation tiers

```
T0 ── Observe → log mistake → smallest safe fix → verify
T1 ── Same mistake in 7 days → prevention rule
T2 ── Systemic → specialist → deep audit → structural fix
T3 ── Cascade → constrained safe mode → handoff
```

### Testing reference

| What | Command |
|------|---------|
| Run all tests | `npm test` |
| One test file | `node --test test/plugins.test.mjs` |
| Filter by name | `node --test --test-name-pattern="validateSchema"` |
| Run coverage | `node --test --experimental-test-coverage` |
| Bun smoke | `bun scripts/smoke-memory-store.mjs` |
| Command audit | `npm run commands:audit` |

**219 tests, 31 suites, all pass.** `node:test` + `node:assert/strict`.

### Config reference

```jsonc
// ~/.config/opencode/openhermes/ohc.json
{
  "enabled": true,
  "min": 50000,
  "max": 150000,
  "preset": "default",
  "trigger_pct": 0.95,
  "target_pct": 0.55
}
```

</details>

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
