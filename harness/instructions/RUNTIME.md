## OpenHermes Runtime

Root: package-local harness plus repo `AGENTS.md`. `AGENTS.md` is the routing layer.

**Skills**: Load on demand through OpenCode's native `skill` tool. Do not preload all skills.

Key skills:
- `oh-expert` — shared AI-coding vocabulary for self-diagnosis. Load when you need to diagnose your own failures.
- `oh-planner` — all-arounder planner. Merges brainstorm, architecture analysis, strategy review, autoplan.
- `oh-builder` — all-arounder builder. Merges prototype, TDD, implementation from plan, interface design.
- `oh-manifest` — full build loop: plan → build → verify → loop until done or blocker.
- `oh-gauntlet` — rigorous multi-axis testing: unit tests, dual-axis review, edge cases, QA, canary.
- `oh-grill` — stress-test plans through Socratic questioning. Optionally updates CONTEXT.md, ADRs, and extracts ubiquitous language.
- `oh-plan-review` — multi-lens plan review: Engineering, Design, DX, Strategy perspectives.
- `oh-security` — security audit: secrets archaeology, supply chain, CI/CD, OWASP, STRIDE, LLM security.
- `oh-health` — code quality dashboard: wraps project tools, computes composite score, tracks trends.
- `oh-skill-craft` — create new agent skills for the harness.
- `oh-investigate` — systematic bug diagnosis.
- `oh-handoff` — compact session into structured handoff artifact.
- `oh-retro` — retrospective after shipping.
- `oh-init` — initialize project with OpenHermes harness.

**Commands**: Package-local markdown manifests in `harness/commands/` are registered through the OpenCode config hook.

**Agents**: `OpenHermes` is the default primary orchestrator. Keep built-in OpenCode agents available for planning and exploration, and add custom subagents through `harness/agents/`.

**Workflow**:
- Inspect first with native file tools.
- Delegate substantive work to subagents using structured handoff.
- Treat multi-file changes as planned work, not improvisation.
- Checkpoint before handoff. Verify after each return.
- Verify before claiming success.

**Orchestration discipline**:
- **Session pool**: Subagents run in their own sessions with isolated context. No cross-session state leakage. Each subagent reports a single result back.
- **Concurrency**: Parallelize independent sub-tasks. Sequentialize dependent ones. Do not parallelize phases that share mutable state.
- **Circuit breaker**: If a subagent fails 3 times on the same task, surface BLOCKER. Do not silently retry.
- **Pipelined verification**: Build → auto-verify. Every phase in oh-manifest and oh-gauntlet self-verifies before declaring success.
- **Background vs sync**: Independent work → background (fire-and-forget). Dependent work → sync (await result). Check task result before proceeding.

**Shared state**:
- `.opencode/plan.md` — produced by oh-planner, consumed by oh-builder and oh-manifest
- `.opencode/work-log.md` — progress tracking across subagent delegations
- `.opencode/todo.md` — task tracking for multi-step work

**Bootstrap**: `harness/codex/CONSTITUTION.md`, this file, `CONTEXT.md`, and `ETHOS.md` are injected into the first user message so the agent starts with the same operating model every session.

**Memory**: deferred for now. Do not invent a persistence layer.

## Conventions

Security, coding style, testing, and orchestration standards:
- See `CONVENTIONS.md` for the shared baseline.
- Skills provide the detailed walkthroughs for specialized workflows.
