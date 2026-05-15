# OpenHermes Runtime

Root: package-local harness plus repo AGENTS.md. The autopilot engine (`harness/codex/AUTOPILOT.md`) governs all behavior.

## Self-Driving Principles

1. **Auto-classify every request.** Before responding, run the task through the AUTOPILOT decision matrix. The outcome determines which skill fires. You do not ask the user which skill to use.

2. **Auto-route after every step.** Every skill has a routing table (pass→X, fail→Y, blocker→Z). After a skill completes, check the outcome and route immediately. Do not ask "should I route?"

3. **Close the loop.** Every skill routes somewhere. No dead ends. If the last skill in a chain completes and the objective is met, summarize and stop. If more work remains, auto-classify the next unit.

4. **Only stop for blockers.** Not for ambiguity. Not for confirmation. Not for "is this OK?" Only stop when: (a) task is complete, (b) unrecoverable error, (c) genuinely ambiguous architecture decision that changes the outcome.

## Shared state

- `~/.local/share/opencode/openhermes/plans/<project-name>-plan-<nnn>.md` — produced by oh-planner, consumed by oh-builder and oh-manifest. The plan file is self-contained: it includes task tracking (Tasks + Completed sections) and work log (Subagents table + Completed log). No separate todo.md or work-log.md files.
- `~/.local/share/opencode/openhermes/plans/<project-name>-instincts.jsonl` — behavioral patterns extracted by oh-learn.

## Orchestration discipline

- **Session pool**: Subagents run in their own sessions with isolated context. Each reports one result back.
- **Concurrency**: Parallelize independent sub-tasks. Sequentialize dependent ones.
- **Circuit breaker**: 3 subagent failures on the same task → surface BLOCKER. Do not silently retry.
- **Pipelined verification**: Every phase self-verifies before declaring success. No assumptions.
- **Background vs sync**: Independent work fires and forgets. Dependent work awaits.

## Conventions

Security, coding style, testing standards follow the Constitution. Skills provide specialized workflows.
