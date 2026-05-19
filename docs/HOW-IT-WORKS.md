# How OpenHermes Works

This document traces the runtime data flow of the OpenHermes plugin package.
It is the primary bus-factor mitigation for the routing engine, hook system, plan storage, and composer.

## 1. Skill Routing Flow

```
User Request
     │
     ▼
Orchestrator (classifies task, loads skill)
     │
     ├── Skill SKILL.md frontmatter defines routes:
     │     pass → [oh-ship, oh-gauntlet]
     │     fail → oh-planner
     │     blocker → surface
     │
     ▼
Route Resolver (harness/lib/routing/route-resolver.ts)
     │
     ├── Collects route candidates from skill frontmatter
     ├── Applies NEXT_ROUTE overrides from subagent output
     ├── Applies ROUTE_GUIDANCE evidence from subagent output
     └── Selects target skill or terminal (surface/done)
     │
     ▼
Dispatch to target skill subagent
```

### Key files:
- `harness/lib/routing/route-resolver.ts` — resolves route candidates from skill frontmatter
- `harness/lib/routing/route-guidance.ts` — applies NEXT_ROUTE overrides and evidence
- `harness/lib/routing/skill-frontmatter.ts` — parses pass/fail/blocker from SKILL.md

## 2. Hook Lifecycle

```
BootstrapPlugin registers hooks during init
     │
     ▼
PreTool hooks fire before tool execution (EARLY → NORMAL → LATE)
     │
     ├── confidence-gate: checks user input for injection tokens
     ├── delegation-depth: prevents runaway agent chains (max 5)
     ├── plan-check: ensures plan files exist for multi-step work
     └── shell-detect: identifies Windows shell type
     │
     ▼
PostTool hooks fire after tool execution
     │
     ├── route-tracking: logs which route was taken
     ├── next-route: captures NEXT_ROUTE from output
     └── dynamic-route: applies evidence-driven routing
     │
     ▼
Route hooks modify routing decisions
     │
Session hooks fire on session boundaries
```

### Hook Types:
| Type | When | Count |
|------|------|-------|
| PreTool | Before each tool call | 4 |
| PostTool | After each tool call | 3 |
| Route | During route resolution | 0 (extensible) |
| Session | Session start/end | 0 (extensible) |

### Phases (within each hook type):
- **EARLY** — high-priority, runs first
- **NORMAL** — standard priority
- **LATE** — low-priority, runs last

### Key files:
- `harness/lib/hooks/builtins/` — 7 built-in hook implementations
- `harness/lib/hooks/hooks.test.ts` — hook system tests (928 lines)
- `bootstrap.ts` — hook registration in `plugin.tool.execute.before/after`

## 3. Plan Storage

```
Plans stored at: ~/.local/share/openhermes/plans/<project>/
     │
     ├── <project>/plan-001.md
     ├── <project>/plan-002.md
     └── <project>/plan-003.md
     │
     ▼
Sequential numbering (001, 002, 003...)
     │
     ▼
Status lifecycle:
     active/in-progress → keep
     complete/abandoned → delete
```

### Key files:
- `harness/lib/plans/plan-location.ts` — resolves canonical paths
- `bootstrap.ts` — exports `ensurePlanFile`, `findLatestPlanFile`, `resolveHarnessRoot`

## 4. Composer (Agent Prompt Assembly)

```
9 numbered fragments in harness/lib/composer/fragments/
     │
     ├── 01-identity.md    → "You are OpenHermes..."
     ├── 02-delegation.md  → Core Behaviors
     ├── 03-permissions.md → Permission matrix
     ├── 04-task-flow.md   → Task flow steps
     ├── 05-confidence.md  → Stop Conditions
     ├── 06-parallelization.md → Parallelization rules
     ├── 07-shell.md       → Shell Awareness
     ├── 08-routing.md     → Plan Storage
     └── 09-guardrails.md  → Guardrails + Routing
     │
     ▼
compose.ts assembles fragments with phase filtering (EARLY/NORMAL/LATE)
     │
     ▼
Path traversal sanitization prevents directory escape
     │
     ▼
Output: complete agent prompt consumed by the LLM
```

### Key files:
- `harness/lib/composer/compose.ts` — fragment assembly engine
- `harness/lib/composer/fragments/` — 9 content fragments
- `harness/agents/openhermes.md` — agent manifest declaring fragments

## 5. Full Request Lifecycle (ASCII Overview)

```
┌─────────────────────────────────────────────────────┐
│  User sends request                                 │
│         │                                           │
│         ▼                                           │
│  OpenHermes Orchestrator                            │
│         │                                           │
│         ├── 1. Classify task (investigate/build/...)│
│         ├── 2. Load skill (SKILL.md frontmatter)    │
│         ├── 3. PreTool hooks fire (confidence, etc) │
│         ├── 4. Delegate to subagent                 │
│         ├── 5. Subagent returns output + evidence   │
│         ├── 6. PostTool hooks fire (tracking, etc)  │
│         ├── 7. ROUTE_EVIDENCE parsed                │
│         └── 8. Route to next skill or surface       │
│                    │                                │
│                    ▼                                │
│  Next skill (or surface/done)                       │
└─────────────────────────────────────────────────────┘
```

## Architecture Summary

| System | Purpose | Key File |
|--------|---------|----------|
| Routing | Resolves next skill from frontmatter + evidence | `harness/lib/routing/route-resolver.ts` |
| Hooks | Plugin extensibility points | `harness/lib/hooks/builtins/` |
| Plans | Canonical task tracking | `harness/lib/plans/plan-location.ts` |
| Composer | Agent prompt assembly | `harness/lib/composer/compose.ts` |
