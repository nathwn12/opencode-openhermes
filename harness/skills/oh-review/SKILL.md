---
name: oh-review
description: "Code and design review for pre-landing quality gate"
---

# oh-review

## When to Use
Before merging any PR or landing changes. Analyzes diff for structural issues, safety concerns, and quality problems.

## Workflow
1. **Diff analysis** — review all changed files against base branch
2. **Safety check** — SQL injection, LLM trust boundary violations, conditional side effects
3. **Structural review** — architecture fit, coupling, cohesion, DRY violations
4. **Quality check** — error handling, logging, test coverage, edge cases
5. **Verdict** — approve / changes requested / block with reason

## Scoring
- Critical safety issue → block immediately
- Structural concern → changes requested
- Style/nit → note for follow-up

## Anti-patterns
- Reviewing style before safety (wrong priority order)
- Rubber-stamping without reading the diff
- Requesting changes for subjective preferences
