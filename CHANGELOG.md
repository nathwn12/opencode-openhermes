# Changelog

## 4.3.0 — 2026-05-16

### Features

- **Canonical plan storage:** Plan files now live at `~/.local/share/opencode/openhermes/plans/<project>-plan-<nnn>.md`. No more `.opencode/` directory. Plan files are self-contained with Tasks, Completed, and Work Log sections — no separate `todo.md` or `work-log.md`.
- **Auto-detect user skills:** Skills in `~/.agents/skills/` and `~/.config/opencode/skills/` are discovered automatically on every session. On name conflict with a built-in `oh-*` skill, the user version wins. User skills survive `npm update openhermes`.
- **Hardened delegation model:** Constitution §5 and Ethos §4 — "Always delegate — never execute". OpenHermes never writes code, runs tests, or touches files directly.
- **All 29 skill triggers hardened:** Single common words removed from trigger lists. 13 skills gained explicit trigger lists. Reduces accidental skill loading.
- **oh-init rewritten:** No `.opencode/` scaffolding, no global task directory. Simplified 6-phase flow targeting canonical plan storage.

### Fixes

- **bootstrap.ts:** Plan lookup now uses `findLatestPlanFile` against canonical storage. User skills auto-wired with override priority over built-in skills. Skill count logging added.
- **oh-fusion (integration):** Fused skills written to `~/.config/opencode/skills/` (user dir, survives npm updates).
- **oh-skill-craft (output location):** New skills written to user skill directories instead of package `harness/skills/`.
- **RUNTIME.md:** Consolidated shared state — single plan file with embedded sections replaces separate plan/todo/work-log files.
- **ROUTING.md:** All `.opencode/` references replaced with canonical storage paths.
- **Tests:** Behavioral tests use `setPlanStorageDirForTest` for canonical storage isolation.

## 4.2.0 — 2026-05-16

### Features

- **oh-facade (full UI pipeline):** 5-phase workflow — Concept → Design System → Build → Audit → Iterate. Generates design tokens, component architecture, production code, and structured audit. Tier 4 skill.
- **oh-full-output (truncation override):** Enforces complete code generation, bans placeholder patterns (`// ...`, `/* TODO */`), handles token-limit splits. Tier 2 skill.
- **oh-fusion (skill ingestion):** 6-phase pipeline — Discovery → Analysis → Decision → Adaptation → Fusion → Integration. Ingests external skills and wires them into the OH harness. Tier 3 skill.
- **oh-refactor (surgical refactoring):** Behavior-preserving code restructuring — extract functions, eliminate duplication, improve type safety, simplify conditionals, remove dead code. Tier 3 skill.
- **oh-skill-craft (meta-skill):** Creates new agent skills with proper frontmatter, progressive disclosure structure, bundled scripts, and test harnesses. Tier 2 skill.
- **AUTOPILOT.md (autonomous routing engine):** Decision-matrix task classification, outcome-based routing chains, Loop Guard (3x repeat / 5-hop ceiling), and Question Gate safety valves. Formalizes the closed-loop operating model.
- **ROUTING.md (canonical routing graph):** Formal routing tables for all skills with outcome-based transitions (pass → next, fail → fallback, blocker → surface).
- **Constitution §§10-13 restructured:** §10 "Push back when needed" → "Closed-loop autonomy" with autopilot references. §§10-12 renumbered to 11-13. Escalation T0-T3 rewritten for auto-classify/auto-route/auto-execute chain.
- **RUNTIME.md overhaul:** Consolidated shared state definition, orchestration discipline rules, circuit breaker protocol.
- **ETHOS.md (5th principle):** "Closed Loop" added — auto-classify, auto-route, auto-execute. No dead ends, no asking permission.

### Fixes

- **openhermes.md (agent):** Updated skill descriptions, delegation rules, routing loop, and safety layer references.

## 4.1.0 — 2026-05-15

### Features

- **oh-learn (instinct system):** Full learning engine — Extract, Evolve, Promote workflows with trigger-action-confidence data model stored in `.opencode/instincts.jsonl`.
- **oh-manifest (pre-flight gates):** Mandatory 4-check gate before any loop (quality baseline, rollback path, branch isolation, scope documented). Loop pattern selection (sequential, continuous-pr, infinite, rfc-dag). Escalation triggers for stall, retry storm, cost drift, quality regression.
- **oh-init (takeover wiring):** Scaffolds `.opencode/` runtime skeleton (plan.md, todo.md, work-log.md, instincts.jsonl) and wires AGENTS.md with OpenHermes orchestrator instructions.
- **oh-investigate (Phase 0):** "Build signal first" methodology with 10 ranked strategies and hard gate before hypothesise.
- **oh-builder (two-branch prototype):** Decision tree (Terminal vs UI prototype), 6 enforceable rules (throwaway naming, no persistence, delete-or-absorb).

### Fixes

- **bootstrap.ts:** Removed redundant config.instructions push (double bootstrap injection). Tests updated.
- **RUNTIME.md:** Scrub dead CONVENTIONS.md reference, add instincts file to shared state.
- **AGENTS.md, README.md, ROUTING.md:** Fix stale `.mjs` references (→ `.ts`), wrong oh-freeze description, `oh-skillcraft` naming mismatch.
- **oh-gauntlet, oh-review:** Remove dead `STYLE.md`/`STANDARDS.md`/`STYLEGUIDE.md` lookups.
- **CI:** Switch from Node.js to Bun (`oven-sh/setup-bun@v2`).
- **package.json:** Remove `test/` from publish `files`.
- **lib/harness-resolver.ts:** Clean stale comment.

### Removals

- `harness/instructions/CONVENTIONS.md` — orphaned scaffold remnant (206 lines).
