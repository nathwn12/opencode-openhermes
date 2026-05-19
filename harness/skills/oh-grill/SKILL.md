---
name: oh-grill
description: "Stress-tests plans through multi-perspective Socratic questioning. Delegates to CEO/Eng/Design/DX lenses in parallel, computes compound confidence score, and routes to execution when marble clarity (≥8/10 + contradictions resolved) is achieved."
tier: 3
route:
  pass:
    - oh-builder
    - oh-planner
  fail: oh-planner
  blocker: surface
---

# oh-grill

Multi-perspective plan stress-test. Delegates to four lens sub-agents in parallel, computes compound confidence, and routes to execution when marble clarity is reached. Mirrors oh-review's parallel sub-agent pattern.

## Steps

1. **Load lenses** — Read all applicable lenses from `lenses/` directory. Select based on plan type (backend-only may skip design+DX).
2. **Spawn parallel sub-agents** — One per perspective lens. Each receives the plan artifact and the lens instruction file. Each returns: score (0-10), prioritized concerns, and recommended changes.
3. **Aggregate** — Collect scores. Compute compound = Σ(weight × score) / Σ(weights). Merge concerns (critical first, deduplicate).
4. **Evaluate gate** — If contradictions resolved AND compound ≥ 8: emit ROUTE_EVIDENCE with confidence and target → oh-builder. If < 8: emit ROUTE_EVIDENCE with contradictions → oh-planner (targeted revision or deep contradictions).
5. **Output** — Verified plan with compound confidence, per-lens breakdown, flagged contradictions by severity.

## Confidence Scoring

| Band | Communication | Route |
|------|--------------|-------|
| ≥9.5 | HIGH — silent auto-advance | → oh-builder |
| 8-9.4 | MEDIUM — non-blocking echo | → oh-builder |
| 4-7 | MEDIUM — surface top contradictions | → oh-planner revision |
| 1-3 | LOW — deep contradictions section | → oh-planner (fail route) |
| 0 | LOW — surface blocker | → surface |

## Routing

| Outcome | Route |
|---------|-------|
| pass | → oh-builder (build from plan) or oh-planner (return to planner) |
| fail | → oh-planner (revise plan) |
| blocker | → surface |
