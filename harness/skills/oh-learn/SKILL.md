---
name: oh-learn
description: "Use when session learnings should be captured, reviewed, or promoted as reusable instincts for future work."
tier: 2
triggers:
  - "learn from session"
  - "extract patterns"
  - "run oh-learn"
route:
  pass: done
  fail: surface
  blocker: surface
---

# oh-learn

Distills session patterns into **instincts** (trigger-action pairs with confidence), clusters into skill candidates, promotes high-signal patterns from project to global scope.

## Instinct Data Model

JSONL at `~/.local/share/opencode/openhermes/plans/<project>-instincts.jsonl`:
```json
{"trigger": "specific situation", "action": "recommended response", "confidence": 0.5, "applications": 1, "successes": 1, "category": "coding", "source": "oh-learn:extract", "ts": "2026-05-15T12:00:00Z"}
```

**Trigger:** specific, matchable (not general advice). **Action:** executable (not belief). **Confidence:** starts 0.5, +0.05 per success, -0.02/day decay. **Category:** coding, testing, security, git, planning, orchestration, debugging, ux.

## Workflows

### Extract
Scan session for repeated decisions. For each: write instinct. Check existing file for near-duplicates. Merge (max confidence, increment applications) or append.

### Evolve
Read all instincts. Group by category then topic. ≥5 instincts with avg confidence ≥ 0.7 → oh-skill-craft spec. 3-4 with confidence ≥ 0.8 → suggest update to existing skill.

### Promote
Instincts with confidence ≥ 0.85 AND applications ≥ 10 → filter project-specific → append to global `%USERPROFILE%\.config\opencode\instincts.jsonl`. Tag promoted.

### Review / Search / Prune / Export
Review: totals + distributions. Search: by topic, trigger, category, confidence. Prune: stale >30d with confidence < 0.3. Export: portable JSON.

## Anti-patterns
- Hoarding every observation (most aren't learnings)
- Never pruning
- Storing what not why
- Over-promoting to global
- Extracting without applying
- Ignoring confidence

## Routing

| Outcome | Route |
|---------|-------|
| pass | done (report summary) |
| fail | surface |
| blocker | surface |
