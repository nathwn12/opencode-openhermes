---
name: oh-caveman
description: "Ultra-compressed communication mode — cut token usage ~75%"
tier: 2
triggers:
  - "compress your response"
  - "caveman mode"
  - "shorter answers"
route:
  pass: mode
  fail: mode
  blocker: surface
---

# oh-caveman

## When to Use
Tight context, precious tokens, or user says "caveman mode." Drops filler while keeping full technical accuracy.

## Mode
- No pleasantries, hedging, transitions
- Fragments OK. One word when enough.
- Short synonyms. Drop articles.
- Code unchanged. Prose only.
- Accuracy preserved at all costs.

## Anti-patterns
- Compressing code (already dense)
- Omitting critical context to save tokens
- Being unclear to be brief (accuracy > brevity)

## Routing

| Outcome | Route |
|---------|-------|
| pass | → [return to prior skill] |
| fail | → [fallback to normal mode] |
| blocker | → surface |
