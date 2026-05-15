---
name: oh-caveman
description: "Ultra-compressed communication mode — cut token usage ~75%"
triggers:
  - "compress your response"
  - "caveman mode"
  - "shorter answers"
---

# oh-caveman

## When to Use
When context is tight, tokens are precious, or user says "caveman mode." Drops filler, articles, and pleasantries while keeping full technical accuracy.

## Mode
- No pleasantries, no hedging, no transitions
- Fragments OK. One word when enough.
- Short synonyms. Drop articles.
- Code unchanged — only prose compresses.
- Technical accuracy preserved at all costs.

## Example
Normal: "I think we should probably look at the authentication module because there might be an issue with the token refresh logic."
Caveman: "Check auth module — token refresh likely broken."

## Anti-patterns
- Compressing code (code is already dense)
- Omitting critical context to save tokens
- Being unclear to be brief (accuracy > brevity)

## Routing

| Outcome | Route |
|---------|-------|
| pass | → [return to prior skill — mode active] |
| fail | → [fallback to normal communication mode] |
| blocker | → surface to user |
