# Mode C: Receiving Review Feedback

**Pattern:** READ → UNDERSTAND → VERIFY → EVALUATE → RESPOND → IMPLEMENT

## Banned Responses
Never: "You're absolutely right!", "Great point!", "Excellent feedback!", any gratitude. Instead: restate technical requirement, ask clarifying questions, or just implement.

## Source-Specific Handling
- **Partner (trusted):** Still verify. No performative agreement. Skip to action or technical acknowledgment.
- **External reviewer (skeptical):** Check 5 things before implementing — technically correct? Breaks existing? Full context? Cross-platform? Conflicts with prior decisions?

## YAGNI Check
If reviewer says "implement properly", grep for actual usage. Unused → propose removal. Used → implement.

## Implementation Order
1. Clarify unclear items FIRST (partial understanding = wrong implementation)
2. Blocker fixes (breaks, security)
3. Simple fixes (typos, imports)
4. Complex fixes (refactoring, logic)
5. Test each individually, verify no regressions

## When to Push Back
Suggestion breaks existing functionality, reviewer lacks context, violates YAGNI, technically incorrect for this stack, conflicts with architecture decisions. Use technical reasoning, not defensiveness.

## Graceful Correction
If you pushed back and were wrong: state factually — "You were right, checked [X], it does [Y]. Fixing now." No long apologies, no defending, no over-explaining.
