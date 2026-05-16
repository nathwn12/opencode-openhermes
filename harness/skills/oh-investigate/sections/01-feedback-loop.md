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

**Sharpen the loop:** Faster? Sharper signal (specific symptom, not "didn't crash")? More deterministic (pin time, seed RNG, isolate FS)? A 2s deterministic loop is a superpower.

**Non-deterministic:** Goal = higher reproduction rate. Loop 100×, parallelize, add stress. 50% flake is debuggable; 1% is not.

**Cannot build a loop?** Stop. Say so. List what you tried. Do NOT hypothesise without a loop.
