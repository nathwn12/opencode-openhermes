# Loop Protocol
1. Run all stages (skip 5 if not deploying)
2. 0 critical + 0 major → DONE
3. Criticals/majors exist → fix highest severity, re-run affected stages
4. Fix impossible → BLOCKER: `<what> | Options: A, B, C`

# Anti-patterns
- Sequential when parallel possible
- Mixing Standards and Spec findings (keep axes separate)
- Skipping edge case sweep because tests pass
- Ignoring minors (accumulated design debt)
- Pushing critical failures without surfacing
- Skipping TDD — writing code without a failing test first
- Tests that pass immediately without having failed first (might test wrong thing)

# Routing

| Outcome | Route |
|---------|-------|
| pass | → oh-ship |
| fail | → oh-builder (fix issues) |
| blocker | → surface |
