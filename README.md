<p align="center">
  <h1 align="center">⟳ OpenHermes</h1>
  <p align="center"><b>Closed loop. Zero permission.</b><br>
  <i>The AI orchestrator that never asks "should I continue?" — it just routes.</i></p>
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

Drop it into OpenCode. Get a self-driving pipeline: auto-classify every request, delegate to specialists, route results automatically. No "can I?", no "shall I?", no "what next?" — just execution until the job is done.

```json
{ "plugin": ["openhermes@git+https://github.com/nathwn12/openhermes.git"] }
```

To install from `dev` (latest features, may be unstable):

```json
{ "plugin": ["openhermes@git+https://github.com/nathwn12/openhermes.git#dev"] }
```

---

## One sentence. Nine steps.

Add the plugin. Restart. Type:

> *"Plan a CLI tool for managing dotfiles."*

You see output. Behind the scenes, this runs:

| # | What fires | What it does |
|---|---|---|
| **1** | `AUTOPILOT.md` decision matrix | Multi-step, vague → `PLANNING NEEDED` |
| **2** | `oh-planner` | Brainstorm mode: architecture, user flow, risks |
| **3** | `oh-planner` → `oh-grill` | Plan passes → stress-test it |
| **4** | `oh-grill` → `oh-planner` (revise) | Gaps found → planner revises |
| **5** | `oh-planner` → `oh-manifest` | Plan solid → enter build loop |
| **6** | `oh-planner` → `oh-builder` → `oh-gauntlet` | Implement → test → review → loop |
| **7** | `oh-gauntlet` → `oh-ship` | Tests pass → PR pipeline |
| **8** | `oh-ship` → `oh-retro` | Shipped → retrospective |
| **9** | `oh-retro` → `oh-planner` | Ready for the next cycle |

One sentence. Nine automated steps. Each skill loaded on demand, executed in isolation, routed to the next specialist. **Auto-classify, delegate, route, repeat.** That's the entire model.

---

### Three safety layers

The loop runs unsupervised because these never turn off:

- **🔁 Loop Guard** — stops if the same skill fires 3+ times or 5+ hops produce no progress
- **❓ Question Gate** — never routes into uncertainty; surfaces if input is missing
- **📋 Auto-Handoff** — writes a structured session artifact before context switches

---

## What you get

| Capability | Why it matters |
|---|---|
| **Self-driving loop** | Type once. OpenHermes classifies, delegates, and routes — no pauses, no asking permission. |
| **29 specialist skills** | Planning → building → testing → security → review → shipping → retro. Every dev cycle phase. |
| **Auto-detected user skills** | Drop a skill in `~/.agents/skills/`. OpenHermes finds it. Same name as a built-in? Your version wins. Survives `npm update`. |
| **`/oh-doctor`** | Verify plugin load, skill discovery, command registration, config safety. |
| **`/oh-log`** | Session log — routing hops, skill loads, compaction events. |
| **Shared operating model** | CONSTITUTION + RUNTIME + CONTEXT + ETHOS injected every session. Every interaction grounded in the same rules. |
| **Plan file storage** | `~/.local/share/opencode/openhermes/plans/`. Survives `npm update`. |

## 29 skills — three tiers

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
| **oh-planner** | Brainstorm, architect, autoplan, decision pipeline |
| **oh-grill** | Stress-test plans through relentless Socratic questioning |
| **oh-plan-review** | Multi-lens review: Engineering, Design, DX, Strategy |
| **oh-security** | Audit: secrets, supply chain, CI/CD, OWASP, LLM security |
| **oh-refactor** | Surgical behavior-preserving refactoring |
| **oh-review** | Two-axis review (Standards + Spec) in parallel sub-agents |
| **oh-fusion** | Skill ingestion pipeline: discover → analyze → adapt → fuse → integrate |
| **oh-retro** | Weekly retrospective — analyze commit history and patterns |

### Tier 2 — Focused skills
Single-purpose, one thing well:

| Skill | Purpose |
|---|---|
| **oh-expert** | AI self-diagnosis: sycophancy, hallucination, attention dynamics |
| **oh-full-output** | Override truncation, ban placeholders, enforce complete generation |
| **oh-health** | Code quality dashboard: tools, composite score, trend |
| **oh-investigate** | Systematic bug diagnosis with root cause investigation |
| **oh-handoff** | Compact session state → structured handoff document |
| **oh-skill-craft** | Create new agent skills with frontmatter and bundled resources |
| **oh-init** | Wire AGENTS.md, domain docs, issue tracker, triage labels |
| **oh-triage** | Issue triage state machine — classify, prioritise, assign |
| **oh-issue** | Break a plan/spec/PRD into independently-grabbable issues |
| **oh-prd** | Conversation → PRD → GitHub issue |
| **oh-caveman** | Ultra-compressed mode — cut token usage ~75% |
| **oh-freeze** | Restrict file edits to a specific directory |
| **oh-learn** | Extract, evolve, promote session learnings as instincts |
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
├── bootstrap.ts           # Plugin entry — registers everything
├── index.ts               # Package entrypoint
├── lib/                   # harness-resolver.ts, logger.ts
├── harness/
│   ├── agents/            # Agent manifests (OpenHermes primary)
│   ├── codex/             # CONSTITUTION, AUTOPILOT, ROUTING
│   ├── commands/          # Slash commands (/oh-doctor, /oh-log)
│   ├── instructions/      # RUNTIME.md
│   └── skills/            # 29 skill SKILL.md files
└── test/
```

Plan files: `~/.local/share/opencode/openhermes/plans/<project>-plan-<nnn>.md`

---

## Get started — 60 seconds

1. Add the plugin line to `opencode.json`
2. Restart or reload OpenCode
3. Run `/oh-doctor` to verify everything loaded
4. Type *any* prompt — "plan a feature", "investigate this bug", "refactor this module"

The first time you see OpenHermes auto-route to a specialist skill without you asking — you'll feel the loop.

---

**Star on [GitHub](https://github.com/nathwn12/openhermes)** ⭐ — bug reports, feature requests, and contributions welcome.
