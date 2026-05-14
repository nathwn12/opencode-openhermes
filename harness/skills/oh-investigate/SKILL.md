---
name: oh-investigate
description: "Systematic bug diagnosis with root cause investigation"
---

# oh-investigate

## When to Use
When a bug is reported, a test fails, or unexpected behavior occurs. Use this before attempting any fix.

## Workflow
1. **Reproduce** — get a reliable reproduction case (script, test, or steps)
2. **Minimise** — strip away unrelated code until the minimal reproduction remains
3. **Hypothesise** — list possible root causes, rank by likelihood
4. **Instrument** — add logging, assertions, or debug output to test hypothesis
5. **Fix** — implement the smallest correct change addressing root cause
6. **Regression test** — verify fix doesn't break existing behavior
7. **Document** — log the root cause and fix in the handoff, issue, or docs that are actually in scope

## Iron Law
No fixes without root cause. Surface-level fixes compound into technical debt.

## Anti-patterns
- Fixing symptoms instead of causes (the same bug reappears next week)
- Changing code without reproducing the bug first
- "Shotgun" debugging — changing multiple things hoping one sticks
- Not documenting root cause for future reference

## Routing

| Outcome | Route |
|---------|-------|
| pass | → oh-builder (implement the fix) |
| fail | → oh-expert (deepen diagnosis) |
| blocker | → surface to user |
