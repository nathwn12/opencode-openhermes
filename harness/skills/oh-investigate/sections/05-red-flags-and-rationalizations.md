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
