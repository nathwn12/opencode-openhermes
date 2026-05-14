---
name: oh-gauntlet
description: "Rigorous multi-axis testing gauntlet: unit, integration, edge cases, dual-axis review. Loops until done or blocker."
tier: 4
benefits-from: [oh-expert, oh-builder]
triggers:
  - "gauntlet"
  - "test everything"
  - "rigorous testing"
  - "review all angles"
  - "qa"
  - "full review"
  - "run the gauntlet"
  - "validate"
---

# oh-gauntlet

Runs the current build through a multi-axis gauntlet: tests, edge cases, standards review, spec review. Spawns parallel sub-agents for independent axes. Loops until everything passes or a blocker is surfaced.

## Gauntlet Stages

Each stage runs independently (parallel where possible). A stage that fails loops: fix → re-run → verify → pass or blocker.

### Stage 1: Test Suite
Run all existing tests. Check both that they pass and that they actually test the right things:
- **Unit tests** — do they pass? Are they testing behavior or implementation?
- **Integration tests** — do the real code paths work end-to-end?
- **Edge case coverage** — empty states, error states, boundary conditions, concurrency

If tests are missing or weak, flag what should be added. Do not add them here — surface as finding.

### Stage 2: Dual-Axis Review (parallel sub-agents)

Spawn two sub-agents simultaneously:

**Standards sub-agent:** Read the repo's documented standards (CONTEXT.md, AGENTS.md, eslint config, ADRs, STYLE.md, CONVENTIONS.md). Then read the diff. Report every place the diff violates a documented standard. Cite the standard source. Distinguish hard violations from judgement calls.

**Spec sub-agent:** Read the spec source (plan.md, issue, PRD, or user's description). Then read the diff. Report: (a) requirements that are missing or partial, (b) scope creep (behavior not asked for), (c) requirements that look implemented but wrong. Quote the spec.

Report both axes independently — do not merge or rank. A change can pass one and fail the other.

### Stage 3: Edge Case Sweep
Systematic edge case analysis for the changed code:
- Error states — what happens when inputs are invalid, files are missing, network fails?
- Concurrency — race conditions, deadlocks, stale state
- Security — injection, auth bypass, data leakage, permission escalation
- Performance — N+1 queries, unbounded loops, memory leaks, unnecessary allocations
- State transitions — invalid state transitions, partial updates, rollback gaps

For each finding: severity (critical/major/minor), location, reproduction path.

### Stage 4: QA Sweep (tiered)
Systematic testing with iterative fix-verify cycles. Choose tier based on risk:

- **Quick** — critical/high severity flows only
- **Standard** — critical + medium severity, full edge case sweep
- **Exhaustive** — all of the above + cosmetic, edge cases, cross-browser

1. Execute tests against each user flow, edge case, error state
2. Log findings with severity, reproduction steps, evidence
3. Fix highest-severity first, commit each fix atomically
4. Re-verify after each fix — confirm fix, check for regressions
5. Produce health scores (before/after)

### Stage 5: Canary (post-deploy)
If deploying to production:

1. **Set baseline** — capture pre-deploy screenshots and metrics
2. **Deploy check** — verify deploy completed successfully
3. **Canary run** — navigate key user flows, capture screenshots, log console errors
4. **Compare** — diff against pre-deploy baselines
5. **Alert** — surface anomalies, performance regressions, new errors
6. **Recovery** — if critical issues found, suggest rollback

Output: health status, screenshots (before/after), error log, performance diff, ship/no-go verdict.

### Stage 6: Manual Verification Checklist
Based on the plan's verification criteria or spec:
- [ ] Happy path works end-to-end
- [ ] Error path degrades gracefully
- [ ] No regression in adjacent areas
- [ ] Logging/monitoring covers failure modes
- [ ] Documentation matches behavior (if applicable)

## Loop Protocol

1. Run all 6 stages (skip Stage 5 if not deploying)
2. Collect findings by severity
3. If 0 criticals and 0 majors → DONE
4. If criticals or majors exist → fix highest severity first
5. After fix → re-run affected stages only
6. If fix is impossible within scope → surface BLOCKER

## Blocker Protocol

```
BLOCKER: <what failed>
Context: <what was attempted, why it cannot proceed>
Options:
  A: <scope reduction>
  B: <alternative approach>
  C: <dependency change>
```

## Anti-patterns
- Running stages sequentially when they can be parallel (Standards and Spec reviews are independent)
- Mixing Standards and Spec findings (keep axes separate — one can pass while the other fails)
- Skipping edge case sweep because tests pass (tests confirm behavior, not absence of edge cases)
- Ignoring minors because no criticals exist (accumulated minors signal design debt)
- Pushing through critical failures without surfacing blocker

## Routing

| Outcome | Route |
|---------|-------|
| pass | → oh-ship (all checks pass) |
| fail | → oh-builder (fix issues found) |
| blocker | → surface to user |
