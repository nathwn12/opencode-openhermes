# oh-gauntlet — Deep Reference

## Stage 1: Test Suite

Run all tests. Check they test behavior (not implementation). Flag gaps in edge case coverage. Do NOT add tests — surface as findings.

**TDD Iron Law:** `NO PRODUCTION CODE WITHOUT A FAILING TEST FIRST`. If code was written before its test — flag as severe quality gap.

**RED-GREEN-REFACTOR verification:** For new code in diff, verify each function has a test, the test was seen to fail before implementation (commit history), minimal code was written to pass each test, and tests use real code (not mocks unless unavoidable).

**Rationalization Table:**

| Excuse | Reality |
|--------|---------|
| "Too simple to test" | Simple code breaks. Test takes 30 seconds. |
| "I'll test after" | Tests passing immediately prove nothing. |
| "Already manually tested" | Ad-hoc ≠ systematic. Can't re-run. |
| "Deleting X hours is wasteful" | Sunk cost fallacy. Keeping unverified code is technical debt. |
| "TDD will slow me down" | TDD faster than debugging. |
| "Existing code has no tests" | You're improving it. Add tests for existing code. |

**Red Flags** (any = quality gap): Code before test · Test passes immediately · Can't explain why test failed · Rationalizing "just this once" · "Keep as reference" or "adapt existing code" · "Already spent X hours, deleting is wasteful" · "TDD is dogmatic, I'm being pragmatic" · "Tests after achieve the same purpose"

**TDD Verification Checklist:**
- [ ] Every new function has a test
- [ ] Watched each test fail before implementing (evidence)
- [ ] Wrote minimal code to pass each test
- [ ] All tests pass
- [ ] Output pristine (no errors/warnings)
- [ ] Tests use real code (mocks only if unavoidable)
- [ ] Edge cases and errors covered

## Stage 2: Dual-Axis Review (parallel sub-agents)

- **Standards** — read documented standards (CONTEXT.md, AGENTS.md, eslint, ADRs). Report every violation. Cite source. Distinguish hard violations from judgment calls.
- **Spec** — read spec source (plan/issue/PRD). Report missing/partial requirements, scope creep, wrong implementations. Quote the spec.

Report independently. Do not merge or rank.

## Stage 3: Edge Case Sweep

- Error states — invalid inputs, missing files, network failure
- Concurrency — races, deadlocks, stale state
- Security — injection, auth bypass, data leakage
- Performance — N+1, unbounded loops, leaks
- State transitions — invalid transitions, partial updates

Per finding: severity (critical/major/minor), location, reproduction.

## Stage 4: QA Sweep (tiered)

Quick (critical only) / Standard (+ medium) / Exhaustive (+ cosmetic). Execute flows, log findings, fix highest severity first, re-verify after each fix.

## Stage 5: Canary (post-deploy)

Capture pre-deploy baselines. Deploy. Navigate key flows. Diff against baselines. Surface anomalies. Suggest rollback if critical.

## Stage 6: Manual Verification

- Happy path, error path, no regression, logging covers failures, docs match behavior.

## Loop Protocol

1. Run all stages (skip 5 if not deploying)
2. 0 critical + 0 major → DONE
3. Criticals/majors exist → fix highest severity, re-run affected stages
4. Fix impossible → BLOCKER: `<what> | Options: A, B, C`

## Anti-patterns

- Sequential when parallel possible
- Mixing Standards and Spec findings (keep axes separate)
- Skipping edge case sweep because tests pass
- Ignoring minors (accumulated design debt)
- Pushing critical failures without surfacing
- Skipping TDD — writing code without a failing test first
- Tests that pass immediately without having failed first (might test wrong thing)
