# Scoring
- Critical safety → block before sub-agents
- Structural concern / spec deviation → changes requested
- Style/nit → follow-up note

# Anti-patterns
- Style before safety
- Rubber-stamping without reading diff
- Subjective preference changes
- Merging Standards + Spec findings (one axis masks the other)
- Proposing interfaces before user picks a candidate
- Performative agreement (thanking reviewer before verifying)
- Blind implementation of reviewer suggestions
- Mixing feedback handling modes

# Routing

| Outcome | Route |
|---------|-------|
| pass | → oh-gauntlet or oh-ship |
| fail | → oh-builder |
| blocker | → surface |
