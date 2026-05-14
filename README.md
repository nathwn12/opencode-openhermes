<p align="center">
  <h1 align="center">&#9764; OpenHermes</h1>
  <p align="center"><i>Plan. Build. Ship. One plugin.</i></p>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/openhermes"><img src="https://img.shields.io/npm/v/openhermes?style=for-the-badge&label=version&color=FFD700" alt="npm version"></a>
  <a href="https://github.com/nathwn12/openhermes/blob/master/LICENSE"><img src="https://img.shields.io/badge/license-MIT-green?style=for-the-badge" alt="License: MIT"></a>
  <a href="https://opencode.ai"><img src="https://img.shields.io/badge/runs%20on-OpenCode-6366f1?style=for-the-badge" alt="Runs on OpenCode"></a>
</p>

---

OpenHermes is an OpenCode plugin that gives your agent a complete skill system out of the box. Add one line to `opencode.json`, get 22 skills, a primary orchestrator, and a shared operating model.

```json
{ "plugin": ["openhermes@git+https://github.com/nathwn12/openhermes.git"] }
```

No setup. No file copying. No extra dependencies.

---

## What you get

### Four core skills

| Skill | What it does |
|---|---|
| **oh-planner** | Brainstorm, analyze architecture, run strategy reviews, auto-decide 90% of questions with gstack decision principles. Produces a consumable plan artifact. |
| **oh-builder** | Prototype, TDD red-green-refactor, design interfaces in parallel sub-agents, implement from plan. Vertical tracer bullets, one test at a time. |
| **oh-manifest** | Full build loop: planner → builder → verify → loop until done or a real blocker is surfaced. Auto-resolves intermediate questions; only interrupts you for genuine blockers. |
| **oh-gauntlet** | Multi-axis testing gauntlet: unit tests, dual-axis review (Standards + Spec in parallel sub-agents), edge case sweep, QA tier, canary post-deploy. |

These four form a pipeline: **think → plan → build → test → ship**. Each produces artifacts the next consumes.

### Twenty-two skills total

| Skill | Purpose |
|---|---|
| oh-planner, oh-builder, oh-manifest, oh-gauntlet | Core pipeline (above) |
| oh-expert | AI self-diagnosis vocabulary — sycophancy, hallucination type, attention degradation |
| oh-grill | Stress-test plans through Socratic questioning; optionally updates CONTEXT.md and ADRs |
| oh-investigate | Systematic bug diagnosis |
| oh-handoff | Compact session into structured handoff artifact for another agent |
| oh-skillcraft | Create new skills for the harness (meta-skill) |
| oh-init | Initialize a project with OpenHermes |
| oh-retro | Retrospective after shipping |
| oh-review | Code and design review — dual-axis (Standards + Spec) |
| oh-ship | PR, version bump, changelog |
| oh-triage | Issue triage state machine |
| oh-issue | Break plans into vertical-slice issues |
| oh-prd | Write structured PRDs |
| oh-caveman | Ultra-compressed response mode |
| oh-freeze | Freeze dependencies |
| oh-learn | Learn patterns from the codebase |
| oh-guard | Safety confirmations for destructive operations |
| oh-skills-link | Verify skills discovery |
| oh-skills-list | List available skills |

### One orchestrator agent

OpenHermes is the default primary agent — a hub-and-spoke commander that delegates to skills, spawns sub-agents for isolated context, and surfaces blockers instead of silently retrying.

### One diagnostic command

`/oh-doctor` — inspect plugin load, skills discovery, command/agent registration, and config safety.

---

## How it works

OpenHermes loads through OpenCode's native plugin system. On install:

1. `config.skills.paths` is pointed at the package-local `harness/skills/` — skills load on demand through the `skill` tool, no preloading
2. Commands from `harness/commands/` register as slash commands
3. The agent manifest in `harness/agents/` sets OpenHermes as the primary orchestrator
4. Instructions from `CONSTITUTION.md`, `RUNTIME.md`, `CONTEXT.md`, and `ETHOS.md` are injected into every session

Everything is package-local. Nothing is copied into your global config.

---

## Layout

```
openhermes-pkg/
├── AGENTS.md              # Skill/command/agent inventory
├── CONTEXT.md             # Shared language
├── ETHOS.md               # Operating principles
├── bootstrap.mjs          # Plugin loader — registers everything
├── index.mjs              # Package entrypoint
├── harness/
│   ├── agents/            # Agent manifests (OpenHermes)
│   ├── codex/             # CONSTITUTION.md
│   ├── commands/          # Slash command manifests (/oh-doctor)
│   ├── instructions/      # RUNTIME.md, CONVENTIONS.md
│   └── skills/            # 22 skill SKILL.md files
└── test/
```

---

## Inspiration

OpenHermes merges high-signal patterns from:

- **superpowers** — skill loading model (config.skills.paths + bootstrap injection)
- **dictionary-of-ai-coding** — shared vocabulary for agent self-diagnosis
- **skills (mattpocock)** — TDD discipline, write-a-skill meta, design-an-interface parallel sub-agents, dual-axis review
- **gstack** — preamble-tier seniority, artifact-chain pipeline, decision principles
- **opencode-orchestrator** — hub-and-spoke delegation, session pool discipline, pipelined verification
