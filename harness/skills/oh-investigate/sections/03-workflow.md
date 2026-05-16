## Workflow

Complete each phase before proceeding. Each phase consumes the feedback loop built in Phase 0.

### Phase 1 — Root Cause Investigation

**Before attempting ANY fix:**

1. **Reproduce** — Loop confirms the described failure. Exact steps? Every time?
2. **Read Error Messages** — Read stack traces completely. Note line numbers and error codes.
3. **Check Recent Changes** — Git diff, recent commits, new dependencies, env differences.
4. **Minimise** — Strip unrelated code. Remove noise until only the failure path remains.
5. **Gather Evidence** — One probe per hypothesis. Change one variable. Use unique debug prefixes.
6. **Trace Data Flow** — If error is deep in call stack, trace backward (see Root Cause Tracing below).

### Phase 2 — Pattern Analysis

**Find the pattern before fixing:**

1. **Find Working Examples** — Locate similar working code. What works that's analogous?
2. **Compare Against References** — Read reference implementation completely. Don't skim.
3. **Identify Differences** — List every difference between working and broken. Don't dismiss anything.
4. **Understand Dependencies** — What components, config, or environment does this depend on?

### Phase 3 — Hypothesis & Testing

**Scientific method:**

1. **Form Single Hypothesis** — "I think X is root cause because Y." Be specific, not vague.
2. **Test Minimally** — Smallest change to test hypothesis. One variable. Don't fix multiple things.
3. **Verify** — Prediction held? → Phase 4. No → new hypothesis. DON'T stack more fixes.

### Phase 4 — Implementation

**Fix root cause, not symptom:**

1. **Create Failing Test** — Simplest reproduction. Automated if possible. Must fail before fix.
2. **Implement Single Fix** — Address root cause. ONE change. No "while I'm here" improvements.
3. **Verify Fix** — Failing test passes? No other tests broken? Phase 0 loop confirms resolution?
4. **Regression Test** — Verify existing behavior. No regression seam = architecture gap (flag it).
5. **Document** — Log root cause + fix. State which hypothesis was correct. What was the trigger?
