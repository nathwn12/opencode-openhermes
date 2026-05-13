---
name: oh-qa
description: "Full QA workflow — systematic testing with iterative fix-verify cycles"
---

# oh-qa

## When to Use
After implementing a feature or before shipping. Systematically tests a web application and fixes bugs found.

## Workflow
1. **Test plan** — enumerate user flows, edge cases, error states
2. **Execute tests** — use browser/API tools to test each flow
3. **Log bugs** — severity, reproduction steps, screenshots
4. **Fix cycle** — fix highest-severity bugs first, commit each fix atomically
5. **Re-verify** — confirm fix, check for regressions
6. **Health score** — produce before/after scores

## Tiers
- **Quick** — critical/high severity only
- **Standard** — + medium severity
- **Exhaustive** — + cosmetic, edge cases

## Output
QA report with: health scores (before/after), fix evidence, ship-readiness summary.

## Anti-patterns
- Fixing multiple bugs in one commit (hard to roll back)
- Skipping regression check after fix
- Cosmetic fixes before functional ones
