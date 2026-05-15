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

## Phase 0 — Build a feedback loop

**This is the actual skill. Everything else is mechanical.**

A fast, deterministic, agent-runnable pass/fail signal = you find the cause. Without one, staring at code won't save you. **Be aggressive. Refuse to give up.**

### Ways to construct a loop (try in order)
1. Failing test at the bug's seam
2. Curl/HTTP script against dev server
3. CLI invocation + fixture, diff stdout
4. Headless browser — assert on DOM/console/network
5. Replay captured trace in isolation
6. Throwaway harness — minimal subset exercising the bug path
7. Property/fuzz loop — 1000 random inputs
8. Bisection harness — `git bisect run`-able
9. Differential loop — old vs new version output diff
10. HITL script — drive human with structured loop

### Iterate the loop
Faster? Sharper signal (specific symptom, not "didn't crash")? More deterministic (pin time, seed RNG, isolate FS)? A 2s deterministic loop is a superpower.

### Non-deterministic bugs
Goal: higher reproduction rate, not clean repro. Loop 100×, parallelize, add stress, narrow timing. 50% flake is debuggable; 1% is not.

### Cannot build a loop?
Stop. Say so. List what you tried. Do NOT hypothesise without a loop.

## Workflow (consumes the loop)

1. **Reproduce** — loop confirms user's described failure.
2. **Minimise** — strip unrelated code to minimal repro.
3. **Hypothesise** — 3-5 ranked falsifiable hypotheses. Each states a prediction: "If X is cause, changing Y makes bug disappear."
4. **Instrument** — one probe per hypothesis. Change one variable. Tag debug logs with unique prefix.
5. **Fix** — regression test first (watch fail), smallest correct change (watch pass), re-run Phase 0 loop.
6. **Regression test** — verify existing behavior. No seam for regression test = architecture gap (flag it).
7. **Document** — log root cause + fix. State which hypothesis was correct.

## Iron Law
No fixes without root cause. Surface fixes compound into technical debt.

## Anti-patterns
- Fixing symptoms (same bug reappears)
- Changing code without reproducing
- Shotgun debugging (multiple changes hoping one sticks)
- Not documenting root cause
- Hypothesizing without a feedback loop

## Routing

| Outcome | Route |
|---------|-------|
| pass | → oh-builder (fix) |
| fail | → oh-expert (deepen) |
| blocker | → surface |
