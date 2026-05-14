# Changelog

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
