---
name: oh-refactor
description: "Use when code is hard to maintain, functions are too long, code smells accumulate, or the user asks to clean up, improve, or refactor code. Behavior-preserving refactoring — extract, deduplicate, simplify, improve types."
tier: 3
route:
  pass: oh-gauntlet
  fail:
    - oh-planner
    - oh-investigate
    - oh-builder
  blocker: surface
---

# oh-refactor

Improve code structure without changing external behavior.

## Steps

1. Prepare — check test coverage. Write characterization tests if thin. Commit current state. Create feature branch.
2. Identify — find code smell. Understand what the code does. Plan the smallest fix.
3. Refactor in small steps — one change, run tests, commit. Repeat until smell is gone.
4. Verify — all tests pass, manual smoke test if coverage missing, performance unchanged, diff shows structural changes only.
5. Clean up — remove commented-out code, stale imports, dead paths. Update docs only if semantics changed.

## Routing

| Outcome | Route |
|---------|-------|
| pass | → oh-gauntlet (test integrity) |
| behavior unclear | → oh-investigate |
| test gap found | → oh-builder (TDD mode) |
| blocker | → surface |
