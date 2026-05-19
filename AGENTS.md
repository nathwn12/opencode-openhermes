# AGENTS.md — OpenHermes Package

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
  - `test/routing.test.ts` — validates the 30-skill routing graph (entry points, orphans, cycles, self-loops, BFS reachability)
  - `test/plugins-behavioral.test.ts` — plan lifecycle, hook system, delegation depth guard, user skill paths
  - `test/bootstrap-integration.test.ts` — full plugin config cycle via BootstrapPlugin
  - `test/plugins.test.ts` — export sanity checks
  - `test/harness/harness.test.ts` — test utility behavior
- Test fixtures in `test/harness/`: `fixture.ts` (DirHandle with Symbol.asyncDispose), `builders.ts` (typed factory functions), `mocks.ts` (in-memory FS, mock console/exit/emitter)

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
- `harness/skills/` — 30 skills, each a directory with SKILL.md (CORE) + optional DEEP.md
- `harness/lib/` — 4 subsystems: `composer/`, `guards/`, `hooks/`, `plans/`

For a deep dive into the runtime data flow (skill routing, hook lifecycle, plan storage), see [docs/HOW-IT-WORKS.md](docs/HOW-IT-WORKS.md).

## Agent Prompt Composition

The OpenHermes agent prompt is NOT a single file — it's assembled by `harness/lib/composer/compose.ts` from 9 numbered fragments in `harness/lib/composer/fragments/`:

| Fragment | Content |
|----------|---------|
| 01-identity.md | "You are OpenHermes..." |
| 02-delegation.md | Core Behaviors — enforced delegation |
| 03-permissions.md | Permission matrix |
| 04-task-flow.md | Task flow steps |
| 05-confidence.md | Stop Conditions |
| 06-parallelization.md | Parallelization rules |
| 07-shell.md | Shell Awareness + Confidence Gate Examples |
| 08-routing.md | Plan Storage |
| 09-guardrails.md | Guardrails + Routing |

Edit fragments there, not the composed output. The `openhermes.md` agent manifest in `harness/agents/` declares which fragments to compose.

## Skills

30 skills across 4 tiers. Every skill has SKILL.md with frontmatter containing `route.pass`, `route.fail`, `route.blocker`. Blockers ALWAYS route to `"surface"`. Routing targets must be a real skill, a terminal (`surface`, `done`), or internal switch (`mode`).

Auto-discovery paths (in priority order — last wins on name conflict):
1. `harness/skills/` (built-in)
2. `~/.agents/skills/`
3. `~/.config/opencode/skills/`
4. `~/.claude/skills/` (Claude Code backward compat)

Instruction-only skills (no sub-agent, load SKILL.md for routing only): oh-expert, oh-handoff, oh-init, oh-issue, oh-prd, oh-triage, oh-skills-link, oh-skills-list, oh-freeze, oh-guard, oh-ascii, oh-full-output.

Subagent permissions — execution subagents (Tier 3+) get `bash: {"*": "allow"}` + `edit: "allow"` but `task: {"oh-*": "deny"}` — they cannot spawn orchestrators. Only the primary OpenHermes agent can delegate to other oh-* agents.

## Subsystems

- **Composer** — 9 fragment composition, path traversal sanitization, phase filtering
- **Hooks** — 7 built-in hooks with priority-sort ordering, 4 hook types (PreTool/PostTool/Route/Session), 3 phases (EARLY/NORMAL/LATE)
- **Plans** — Canonical path resolution, sequential plan-{nnn}.md naming, status-based lifecycle

## Plan Files

Canonical: `~/.local/share/openhermes/plans/<project-name>/plan-{nnn>.md`
- Status lifecycle: keep `active`/`in-progress`, delete `complete`/`abandoned`
- Sequential numbering (001, 002, 003...)
- Plan file creation is the agent's responsibility — bootstrap does NOT auto-create (prevents ghost skeletons)

## Windows Notes

- CI runs on Ubuntu (`ubuntu-latest`) even though dev uses Windows
- All file operations use `node:fs` (cross-platform by nature)
- SHELL.md defines PowerShell-first Windows protocol
- Path handling: `path.join()` and `path.sep` throughout, no hardcoded `/` or `\`
- Windows reserved device names guarded in `.gitignore` for OpenCode snapshot service compat

## Large-Codebase Verification

When the user asks to VERIFY, STUDY, CHECK, AUDIT, REVIEW, or ANALYZE a large codebase:

1. **Fire parallel readers immediately** — Spawn multiple sub-agents in parallel, each reading a different chunk of the codebase. Do NOT read files sequentially.

2. **Prioritize high-value targets** — Config files, entry points, manifests, CI, existing instruction files, and framework configs first. Source code only if architecture is still unclear after reading configs.

3. **Stop when confident** — If the parallel reads provide enough context to answer the user's question, surface findings and stop. Do not keep reading.

4. **Signal before going deeper** — If context is still insufficient after the first wave of parallel reads, tell the user: *"I still need to see more — proceed?"* with a brief note on what's still unclear and what the next scan would cover. Only continue if they say yes.
