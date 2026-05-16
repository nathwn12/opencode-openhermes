# oh-investigate — Deep Reference

## The Iron Law

> **NO FIXES WITHOUT ROOT CAUSE INVESTIGATION FIRST. Surface fixes compound into technical debt.**

If you haven't completed root cause investigation, you cannot propose fixes. Violating this process is violating the spirit of debugging.

## Phase 0 — Build a feedback loop

**This is the actual skill. Everything else is mechanical.**

A fast, deterministic, agent-runnable pass/fail signal = you find the cause. Without one, staring at code won't save you.

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

## Workflow

Complete each phase before proceeding. Each phase consumes the feedback loop built in Phase 0.

### Phase 1 — Root Cause Investigation

**Before attempting ANY fix:**

1. **Reproduce** — Loop confirms the described failure. Exact steps? Every time?
2. **Read Error Messages** — Read stack traces completely. Note line numbers and error codes.
3. **Check Recent Changes** — Git diff, recent commits, new dependencies, env differences.
4. **Minimise** — Strip unrelated code. Remove noise until only the failure path remains.
5. **Gather Evidence** — One probe per hypothesis. Change one variable. Use unique debug prefixes.
6. **Trace Data Flow** — If error is deep in call stack, trace backward.

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

## Root Cause Tracing

Bugs manifest deep in call stacks. Fixing at the symptom treats the wrong layer. **Trace backward through the call chain to find the original trigger.**

1. **Observe symptom** — Error at point of failure.
2. **Find immediate cause** — What code directly produces this error?
3. **What called this?** — Step one level up the call chain.
4. **Keep tracing up** — What value was passed? Where from?
5. **Find original trigger** — Root source of bad state. Fix here, not at symptom.

**Stack trace instrumentation:**
```
const stack = new Error().stack;
console.error('DEBUG <component>:', { directory, cwd, stack });
```
Use `console.error()` (logger may be suppressed in tests). Grep output. **Never fix just where the error appears** — trace back and add validation at each layer.

## Multi-Component Diagnostics

**In multi-component systems (CI → build → signing, API → service → database), add instrumentation at each boundary BEFORE proposing fixes:**

- Log data entering and exiting each component
- Verify environment/config propagation across layers
- Check state at each layer

Run once to gather evidence, identify the failing component, THEN investigate it.

**Example (build pipeline):** Layer 1 (workflow → secrets?), Layer 2 (build → env vars?), Layer 3 (signing → keychain?), Layer 4 (actual signing). Reveals which layer fails in one pass.

## Red Flags

**If you catch yourself thinking any of these, STOP. Return to Phase 1.**

- "Quick fix for now, investigate later"
- "Just try changing X and see if it works"
- "Add multiple changes, run tests"
- "Skip the test, I'll manually verify"
- "It's probably X, let me fix that"
- "I don't fully understand but this might work"
- "Pattern says X but I'll adapt it differently"
- Proposing solutions before tracing data flow
- "One more fix attempt" (when already tried 2+)
- Each fix reveals new problem in different place
- "Here are the main problems: [lists fixes without investigation]"
- "Issue is simple, don't need the full process"

**All of these mean: STOP. Return to investigation.**

## 3+ Fix Failure Rule

**After 3 failed fix attempts, STOP and question the architecture.**

Three failed fixes signals an architectural problem:
- Each fix reveals new shared state/coupling in a different place
- Fixes require "massive refactoring" to implement
- Each fix creates new symptoms elsewhere

**Do not attempt Fix #4 without architectural discussion:**
- Is this pattern fundamentally sound?
- Are we sticking with it through inertia?
- Should we refactor architecture vs. continue fixing symptoms?

This is NOT a failed hypothesis — this is a wrong architecture.

## Partner Signal Monitoring

**When your human partner says these, they mean you're guessing, not debugging:**

| Phrase | Meaning |
|--------|---------|
| "Is that happening?" | You assumed without verifying |
| "Will it show us...?" | You skipped evidence gathering |
| "Stop guessing" | You're proposing fixes without understanding |
| "We're stuck?" | Your approach isn't working |

**When you see any of these: STOP. Return to Phase 1.**

## Common Rationalizations

| Excuse | Reality |
|--------|---------|
| "Issue is simple, don't need process" | Simple bugs have root causes too. Process is fast. |
| "Emergency, no time for process" | Systematic is FASTER than guess-and-check thrashing. |
| "Just try this first, then investigate" | First fix sets the pattern. Do it right from start. |
| "I'll write test after confirming fix works" | Untested fixes don't stick. Test first proves bug. |
| "Multiple fixes at once saves time" | Can't isolate what worked. Causes new bugs. |
| "Reference too long, I'll adapt the pattern" | Partial understanding guarantees bugs. Read fully. |
| "I see the problem, let me fix it" | Seeing symptoms ≠ understanding root cause. |
| "One more fix attempt" (after 2+ failures) | 3+ failures = architectural problem. Stop fixing. |

## Anti-patterns

- Fixing symptoms (same bug reappears)
- Changing code without reproducing
- Shotgun debugging (multiple changes hoping one sticks)
- Not documenting root cause
- Hypothesizing without a feedback loop
