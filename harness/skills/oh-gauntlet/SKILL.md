---
name: oh-gauntlet
description: "Use when code is ready for thorough testing — unit tests, integration, edge cases, dual-axis review, and QA. Loops until done or blocker."
tier: 4
route:
  pass: oh-ship
  fail: oh-builder
  blocker: surface
---

# oh-gauntlet

Multi-axis testing: test suite, dual-axis review, edge case sweep, QA, canary.

## Steps

1. Run all tests — verify TDD Iron Law (no production code without failing test first). Flag gaps in edge case coverage.
2. Run dual-axis review — spawn parallel Standards and Spec sub-agents. Report independently. Do not merge or rank.
3. Sweep edge cases — error states, concurrency, security, performance, state transitions. Assign severity (critical/major/minor).
4. Run QA sweep — tiered (quick/standard/exhaustive). Fix highest severity first. Re-verify after each fix.
5. Deploy canary if applicable — capture pre-deploy baselines, navigate flows, diff anomalies, suggest rollback if critical.
6. Run manual verification — happy path, error path, no regression, logging covers failures, docs match behavior.
7. Apply loop protocol — 0 critical + 0 major → done. Fix highest severity, re-run affected stages. Surface blocker with options.

## Routing

| Outcome | Route |
|---------|-------|
| pass | → oh-ship |
| fail | → oh-builder (fix issues) |
| blocker | → surface |
