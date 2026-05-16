# Stage 1: Test Suite

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
