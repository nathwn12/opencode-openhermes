---
name: oh-expert
description: "Self-diagnose agent failure modes: sycophancy, hallucination, attention degradation"
tier: 2
route:
  pass:
    - oh-builder
    - oh-gauntlet
  fail: oh-expert
  blocker: surface
---

# oh-expert

Self-diagnose and fix agent failure modes (sycophancy, hallucination, attention degradation).

## Steps

1. Classify the symptom using the diagnostic map
2. Identify the specific failure mode
3. Apply the appropriate fix from the map
4. If sycophancy suspected, re-ask neutrally without user steer
5. If hallucination suspected, load current docs or compact context
6. If attention degraded, clear and reload
7. If non-determinism, try again
8. If smart zone drift detected, compact — do not push through

## Routing

| Outcome | Route |
|---------|-------|
| pass | → oh-builder (implement fix) or oh-gauntlet (re-test) |
| fail | → oh-expert (re-diagnose) |
| blocker | → surface |
