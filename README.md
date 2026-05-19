<p align="center">
  <h1 align="center">⟳ OpenHermes</h1>
  <p align="center"><b>Pragmatic. Task-focused. Concise.</b><br>
  <i>The AI orchestrator that never stalls — it classifies, delegates, and routes.</i></p>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/openhermes"><img src="https://img.shields.io/npm/v/openhermes?style=for-the-badge&label=version&color=FFD700" alt="npm version"></a>
  <a href="https://github.com/nathwn12/openhermes/blob/master/LICENSE"><img src="https://img.shields.io/badge/license-MIT-green?style=for-the-badge" alt="License: MIT"></a>
  <a href="https://opencode.ai"><img src="https://img.shields.io/badge/runs%20on-OpenCode-6366f1?style=for-the-badge" alt="Runs on OpenCode"></a>
  <a href="https://github.com/nathwn12/openhermes"><img src="https://img.shields.io/badge/⭐%20star%20on-GitHub-181717?style=for-the-badge" alt="Star on GitHub"></a>
</p>

---

**AI coding assistants stall.** They ask permission. They lose context mid-session. They wait for you to unstick them.

OpenHermes doesn't.

Drop it into OpenCode. Get a closed-loop pipeline: auto-classify every request, delegate to specialists, route results automatically. No "can I?", no "shall I?", no "what next?" — just concise execution until the job is done.

```json
{ "plugin": ["openhermes@git+https://github.com/nathwn12/openhermes.git"] }
```

To install from `dev` (latest features, may be unstable):

```json
{ "plugin": ["openhermes@git+https://github.com/nathwn12/openhermes.git#dev"] }
```

---

## One sentence. One engine.

OpenHermes ships with a focused internal architecture — 3 subsystems working together to make every session faster, more reliable, and fully autonomous:

| Subsystem | What it does |
|-----------|-------------|
| **Prompt Composer** | 9 modular fragments joined at runtime → byte-identical. Add a fragment, never edit the composition code. |
| **Hook Registry** | Pluggable pre-tool, post-tool, route, and session hooks with priority-sort ordering. 7 built-in hooks, zero routing boilerplate. |
| **Plan Location** | Resolves plan file paths per project with directory-per-project layout in `~/.local/share/openhermes/plans/`. |
| **Reference Library** | Shared constants and protocols consumed by skills: AI slop blacklist, font blacklist, hard bans, confidence tiers. Single source of truth — edit once, update all consumers. |

---

### Four safety layers

The loop runs unsupervised because these never turn off:

- **🔁 Loop Guard** — stops if the same skill fires 5+ times or 8+ hops produce no progress
- **❓ Question Gate** — never routes into uncertainty; surfaces if input is missing
- **💬 Confidence Gate** — calibrates whether to skip, echo, or ask before classifying

```
  HIGH  ──→ classify silently (transparent gate)
  MEDIUM ──→ echo + confirm, then classify
  LOW   ──→ ask + classify (defaults to oh-planner)
```

- **📋 Auto-Handoff** — writes a structured session artifact before context switches

---

## What you get

| Capability | Why it matters |
|---|---|
| **Self-driving loop** | Type once. OpenHermes classifies, delegates, and routes — no pauses, no asking permission, no verbosity. |
| **33 specialist skills** | Planning → building → testing → browser → security → review → shipping → retro. Every dev cycle phase. |
| **Auto-detected user skills** | Drop a skill in `~/.agents/skills/` or `~/.config/opencode/skills/`. OpenHermes finds it. Same name as a built-in? Your version wins. Survives `npm update`. |
| **Shared operating model** | CHARTER + AUTOPILOT + CONTEXT + ETHOS injected every session. Every interaction grounded in the same rules. |
| **CORE/DEEP skill format** | Every skill is a two-file system: CORE (SKILL.md) handles 80% of passes in one read. DEEP.md loads on demand for hard cases. |
| **Plan file storage** | `~/.local/share/openhermes/plans/`. Survives `npm update`. |
| **3 internal subsystems** | Composer, hooks, plans — all native Node.js / TypeScript. |
| **Shared reference library** | `harness/reference/` — design blacklist, font bans, confidence tiers, shared protocols. Edit in one place, consumed by every skill. Zero duplication. |
| **Zero npm dependency additions** | All new subsystems use native Node.js and TypeScript only. No new packages. |

## 33 skills — four tiers

### Tier 4 — Pipeline orchestrators
Full multi-phase workflows:

| Skill | Purpose |
|---|---|
| **oh-manifest** | Plan → build → verify → loop until done or blocker |
| **oh-facade** | Concept → design system → build → audit → iterate (full UI pipeline) |
| **oh-gauntlet** | Multi-axis testing: unit, integration, edge cases, dual-axis review |
| **oh-builder** | ALL-arounder builder — prototype, TDD, implement from plan |
| **oh-ship** | Deploy and PR pipeline: test, bump, changelog, PR, deploy, verify |

### Tier 3 — Cross-cutting skills
Span multiple phases and coordinate other skills:

| Skill | Purpose |
|---|---|
| **oh-browser** | Browser automation via agent-browser CLI. Navigate pages, fill forms, take screenshots, scrape data, test web apps. |
| **oh-grill** | Stress-test plans through relentless Socratic questioning |
| **oh-plan-review** | Multi-lens review: Engineering, Design, DX, Strategy |
| **oh-planner** | Brainstorm, architect, autoplan, decision pipeline |
| **oh-security** | Audit: secrets, supply chain, CI/CD, OWASP, LLM security |
| **oh-refactor** | Surgical behavior-preserving refactoring |
| **oh-review** | Two-axis review (Standards + Spec) in parallel sub-agents |
| **oh-fusion** | Skill ingestion pipeline: discover → analyze → adapt → fuse → integrate |
| **oh-retro** | Weekly retrospective — analyze commit history and patterns |
| **oh-worktree** | Workspace isolation via git worktrees. Detect existing isolation, create isolated workspaces, run project setup, verify clean baseline. |

### Tier 2 — Focused skills
Single-purpose, one thing well:

| Skill | Purpose |
|---|---|
| **oh-ascii** | Complete ASCII diagramming: design patterns, generation, structural validation |
| **oh-docs** | Post-ship docs: generate coverage map, update README/ARCHITECTURE/CONTRIBUTING, detect diagram drift, polish CHANGELOG |
| **oh-expert** | AI self-diagnosis: sycophancy, hallucination, attention dynamics |
| **oh-full-output** | Override truncation, ban placeholders, enforce complete generation |
| **oh-health** | Code quality dashboard: tools, composite score, trend |
| **oh-investigate** | Systematic bug diagnosis with root cause investigation |
| **oh-handoff** | Compact session state → structured handoff document |
| **oh-skill-craft** | Create new agent skills with frontmatter and bundled resources |
| **oh-init** | Wire AGENTS.md, domain docs, issue tracker, triage labels |
| **oh-pdf** | Convert markdown to publication-quality PDF with cover page, TOC, watermarks, page numbers |
| **oh-triage** | Issue triage state machine — classify, prioritise, assign |
| **oh-issue** | Break a plan/spec/PRD into independently-grabbable issues |
| **oh-learn** | Persist and manage project learnings: record, review, search, prune, export across sessions |
| **oh-prd** | Conversation → PRD → GitHub issue |
| **oh-freeze** | Restrict file edits to a specific directory |
| **oh-guard** | Safety confirmation — warn before destructive operations |
| **oh-skills-link** | Verify OpenCode discovers the skill directory |
| **oh-skills-list** | List all available `oh-*` skills |

---

## Layout

```
openhermes-pkg/
├── AGENTS.md              # User-side routing overlay
├── CONTEXT.md             # Shared domain language
├── ETHOS.md               # Operating principles
├── docs/
│   ├── HOW-IT-WORKS.md     # Runtime data flow (routing, hooks, plans)
│   └── adr/                 # Architecture Decision Records
├── bootstrap.ts           # Plugin entry — registers everything
├── index.ts               # Package entrypoint
├── harness/
│   ├── agents/            # Agent manifests (OpenHermes primary)
│   ├── codex/             # CHARTER, AUTOPILOT
│   ├── instructions/      # SHELL.md
│   ├── lib/               # Internal subsystems
│   │   ├── composer/      # Prompt fragment composition
│   │   ├── hooks/         # Pluggable hook registry
│   │   ├── plans/         # Plan file path resolution
│   │   └── ...            # guards/ (guard config)
│   ├── reference/          # Shared constants: design-blacklist.md
│   └── skills/            # 33 skill SKILL.md files (CORE/DEEP format)
├── lib/                   # harness-resolver.ts
└── test/
    └── harness/           # Test utilities (fixture, builders, mocks)
```

Plan files: `~/.local/share/openhermes/plans/<project>/plan-<nnn>.md`

---

## Get started — 60 seconds

1. Add the plugin line to `opencode.json`
2. Restart or reload OpenCode
3. Verify the plugin loaded in the startup log
4. Type *any* prompt — "plan a feature", "investigate this bug", "refactor this module"

The first time you see OpenHermes auto-route to a specialist skill without you asking — you'll feel the loop.

---

**Star on [GitHub](https://github.com/nathwn12/openhermes)** ⭐ — bug reports, feature requests, and contributions welcome.
