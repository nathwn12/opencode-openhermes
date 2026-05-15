---
name: oh-investigate
description: "Systematic bug diagnosis with root cause investigation"
tier: 2
triggers:
  - "investigate this bug"
  - "debug this"
  - "why is this broken"
  - "root cause"
route:
  pass: oh-builder
  fail: oh-expert
  blocker: surface
---

# oh-investigate

## When to Use
When a bug is reported, a test fails, or unexpected behavior occurs. Use this before attempting any fix.

## Phase 0 — Build a feedback loop

**This is the actual skill. Everything else is mechanical.**

If you have a fast, deterministic, agent-runnable pass/fail signal for the bug, you will find the cause — bisection, hypothesis-testing, and instrumentation are just consuming that signal. If you don't have one, no amount of staring at code will save you.

Spend disproportionate effort here. **Be aggressive. Be creative. Refuse to give up.**

### Ways to construct a feedback loop (try in this order)

1. **Failing test** at whatever seam reaches the bug.
2. **Curl / HTTP script** against a running dev server.
3. **CLI invocation** with a fixture input, diffing stdout against a known-good snapshot.
4. **Headless browser script** — drive the UI, assert on DOM/console/network.
5. **Replay a captured trace** — save a real payload/event log, replay it in isolation.
6. **Throwaway harness** — minimal subset of the system exercising the bug code path with a single call.
7. **Property / fuzz loop** — run 1000 random inputs, look for the failure mode.
8. **Bisection harness** — automate "boot at state X, check, repeat" so you can `git bisect run` it.
9. **Differential loop** — run same input through old-version vs new-version, diff outputs.
10. **HITL script** — last resort. Drive a human with a structured loop.

### Iterate on the loop itself

- Can I make it faster? (Cache setup, skip unrelated init, narrow the scope.)
- Can I make the signal sharper? (Assert on the specific symptom, not "didn't crash".)
- Can I make it more deterministic? (Pin time, seed RNG, isolate filesystem.)

A 30-second flaky loop is barely better than no loop. A 2-second deterministic loop is a debugging superpower.

### Non-deterministic bugs

The goal is not a clean repro but a **higher reproduction rate**. Loop the trigger 100×, parallelise, add stress, narrow timing windows. A 50%-flake bug is debuggable; 1% is not.

### When you genuinely cannot build a loop

Stop and say so explicitly. List what you tried. Do **not** proceed to hypothesise without a loop.

## Workflow (consumes the loop)

1. **Reproduce** — run the loop, confirm the bug appears. The loop must match the user's described failure, not a different nearby failure.
2. **Minimise** — strip away unrelated code until the minimal reproduction remains.
3. **Hypothesise** — generate 3–5 ranked falsifiable hypotheses before testing any. Each must state a prediction: "If X is the cause, then changing Y will make the bug disappear".
4. **Instrument** — one probe per hypothesis. Change one variable at a time. Tag every debug log with a unique prefix (e.g. `[DEBUG-a4f2]`) for easy cleanup.
5. **Fix** — write the regression test at a correct seam first. Watch it fail. Apply the smallest correct change. Watch it pass. Re-run the Phase 0 loop against the original scenario.
6. **Regression test** — verify fix doesn't break existing behavior. If no correct seam exists for a regression test, that itself is a finding — flag the architecture gap.
7. **Document** — log the root cause and fix in the handoff, issue, or relevant docs. State which hypothesis was correct so the next debugger learns.

## Iron Law
No fixes without root cause. Surface-level fixes compound into technical debt.

## Anti-patterns
- Fixing symptoms instead of causes (the same bug reappears next week)
- Changing code without reproducing the bug first
- "Shotgun" debugging — changing multiple things hoping one sticks
- Not documenting root cause for future reference
- Proceeding to hypothesise without a feedback loop

## Routing

| Outcome | Route |
|---------|-------|
| pass | → oh-builder (implement the fix) |
| fail | → oh-expert (deepen diagnosis) |
| blocker | → surface to user |
