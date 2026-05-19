# AGENTS.md — OpenHermes Package

## Architecture

Entry points:
- `index.ts` — default export of BootstrapPlugin
- `bootstrap.ts` — exports `BootstrapPlugin` (the OpenCode plugin function), plus helpers: `buildCompactionContext`, `formatSessionEvent`, `ensurePlanFile`, `findLatestPlanFile`, `resolveHarnessRoot`, `getHarnessDir`, `setPlanStorageDirForTest`

Harness resolution (`lib/harness-resolver.ts`):
- Scans ancestor directories (up to 3 levels) for `harness/` or `node_modules/openhermes/harness/`
- Validates by requiring these marker files: `harness/codex/CHARTER.md`, `harness/codex/AUTOPILOT.md`, `harness/skills/oh-planner/SKILL.md`
- Supports both dev mode (local `harness/`) and installed mode (`node_modules/openhermes/harness/`)

Key harness directories:
- `harness/codex/` — CHARTER.md (15-article constitution) + AUTOPILOT.md (routing engine, confidence gate, safety valves)
- `harness/instructions/` — SHELL.md (Windows shell detection: PowerShell primary)
- `harness/agents/` — 17 agent manifests (.md with frontmatter), one per subagent type
- `harness/skills/` — 31 skills, each a directory with SKILL.md (CORE) + optional DEEP.md
- `harness/lib/` — 6 subsystems: `composer/`, `guards/`, `hooks/`, `plans/`, `routing/`, `skills-index/`

## Skills

31 skills across 4 tiers. Every skill has SKILL.md with frontmatter containing `route.pass`, `route.fail`, `route.blocker`. Blockers ALWAYS route to `"surface"`. Routing targets must be a real skill, a terminal (`surface`, `done`), or internal switch (`mode`).

Auto-discovery paths (in priority order — last wins on name conflict):
1. `harness/skills/` (built-in)
2. `~/.agents/skills/`
3. `~/.config/opencode/skills/`
4. `~/.claude/skills/` (Claude Code backward compat)

Instruction-only skills (no sub-agent, load SKILL.md for routing only): oh-expert, oh-handoff, oh-init, oh-issue, oh-prd, oh-triage, oh-skills-list, oh-guard, oh-ascii, oh-full-output.

Subagent permissions — execution subagents (Tier 3+) get `bash: {"*": "allow"}` + `edit: "allow"` but `task: {"oh-*": "deny"}` — they cannot spawn orchestrators. Only the primary OpenHermes agent can delegate to other oh-* agents.

---

## Commands

| Action | Command |
|--------|---------|
| Run tests | `bun test` |
| Run a single test file | `bun test test/plugins.test.ts` |
| Run tests matching a pattern | `bun test --test-name-pattern "routing"` |

Only `bun test` exists. No lint, no typecheck, no format scripts. CI matches: `bun install` → `bun test`.

## Process

- **Test-first**: Write the test before the implementation for any new subsystem or behavior change. PRs without tests for new functionality will not be merged.
- **Documentation**: New subsystems or architectural changes must include corresponding docs (ADR, HOW-IT-WORKS, or AGENTS.md entry).

## Testing

- Framework: Node.js built-in `node:test` + `node:assert/strict` (not Bun's native test DSL)
- All tests use `import { describe, it, before, after } from "node:test"` and `import assert from "node:assert/strict"`
- Temp directories: `fs.mkdtempSync` with cleanup in `after()` hooks
- Plan storage override: `setPlanStorageDirForTest()` from bootstrap.ts
- Harness override: `setHarnessRootForTest()` from bootstrap.ts
- Key test files:
  - `test/routing.test.ts` — validates the 31-skill routing graph (entry points, orphans, cycles, self-loops, BFS reachability)
  - `test/plugins-behavioral.test.ts` — plan lifecycle, hook system, delegation depth guard, user skill paths
  - `test/bootstrap-integration.test.ts` — full plugin config cycle via BootstrapPlugin
  - `test/plugins.test.ts` — export sanity checks
  - `test/harness/harness.test.ts` — test utility behavior
- Test fixtures in `test/harness/`: `fixture.ts` (DirHandle with Symbol.asyncDispose), `builders.ts` (typed factory functions), `mocks.ts` (in-memory FS, mock console/exit/emitter)

## Subsystems

- **Composer** — 9 fragment composition, path traversal sanitization, phase filtering
- **Hooks** — 7 built-in hooks with priority-sort ordering, 4 hook types (PreTool/PostTool/Route/Session), 3 phases (EARLY/NORMAL/LATE)
- **Plans** — Canonical path resolution, sequential plan-{nnn}.md naming, status-based lifecycle

## Plan Files

Canonical: `~/.local/share/openhermes/plans/<project-name>/plan-{nnn>.md`
- **One plan = one user request.** A single request may span multiple phases within one plan — that's fine.
- **Never overwrite an existing plan number.** When a new user request arrives, find the latest plan number (`findLatestPlanFile()`) and use the next number (NNN+1).
- **Never modify a completed plan.** Completed plans are frozen historical records.
- **Capture all work in the plan file.** Any unplanned work ("additionals") that surfaces during execution must be added as a new task item or phase — not done conversationally without tracking.
- Status lifecycle: keep `active`/`in-progress`, delete `complete`/`abandoned`
- Sequential numbering (001, 002, 003...)
- Plan file creation is the agent's responsibility — bootstrap does NOT auto-create (prevents ghost skeletons)

## Task Dependency Convention

For parallel build execution, plan tasks use lightweight inline annotations:

```markdown
## Tasks

- [ ] auth module     [depends: none,       coupling: low]
- [ ] payment gateway [depends: none,       coupling: low]
- [ ] dashboard UI    [depends: auth,       coupling: high]
- [ ] README update   [depends: dashboard,  coupling: low]
```

- `depends`: task name this depends on, or `none` for root tasks
- `coupling`: `low` (safe to parallelize in separate worktree) or `high` (must be same worktree, serial)

oh-builder reads this DAG and decides parallelism: low-coupling tasks spawn parallel sub-agents in git worktrees; high-coupling tasks run serially in the primary worktree. Plans without annotations execute serially (backward compatible).
