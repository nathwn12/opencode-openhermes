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
