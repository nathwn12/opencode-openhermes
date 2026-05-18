---
name: oh-manifest
description: "Use when running a complete implementation pipeline from plan through verification. Orchestrates oh-planner + oh-builder with auto-decisions."
tier: 4
route:
  pass: oh-planner
  fail: oh-expert
  blocker: surface
---

# oh-manifest

Full build orchestration loop: pre-flight → plan → build → verify → loop.

## Steps

1. Run pre-flight — verify quality baseline (tests pass), rollback path (clean stash or committed state), branch isolation, scope documented.
2. Load or create plan — load existing plan or dispatch oh-planner. Auto-decide minor scope via decision principles.
3. Dispatch build — run oh-builder for each phase in dependency order. Parallelize independent phases via sub-agents.
4. Review output — spec compliance first, then code quality. Never reverse the order.
5. Verify — check each phase against verification criteria. Tests pass → mark complete. Fail → diagnose, fix, re-verify.
6. Handle implementer status — DONE (proceed), DONE_WITH_CONCERNS (read before proceeding), NEEDS_CONTEXT (provide and re-dispatch), BLOCKED (assess type).
7. Loop — all done → DONE. Phase fails → BLOCKER (surface with options). New work → add to plan, continue.

## Routing

| Outcome | Route |
|---------|-------|
| pass | → oh-planner |
| fail | → oh-expert (diagnose loop failure) |
| blocker | → surface with context and options |

