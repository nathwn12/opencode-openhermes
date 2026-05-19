---
name: oh-docs
description: "Post-ship documentation: generate Diataxis docs, sync README/ARCHITECTURE/CONTRIBUTING, detect diagram drift"
tier: 2
route:
  pass: oh-retro
  fail: oh-builder
  blocker: surface
---

# oh-docs

Post-ship documentation generation and sync. Uses the Diataxis framework (tutorial / how-to / reference / explanation). Called by oh-ship after code ships, or standalone.

## Steps

1. **Scope** — Read the diff (`git diff <base>...HEAD`). Identify changed entities (features, modules, APIs, configs). Confirm scope with user for standalone invocation.
2. **Coverage map** — Read all existing docs. Build a Diataxis coverage map showing quadrant gaps per entity. Report coverage percentage.
3. **Research** — Read source code for each changed entity (entry points, tests, inline comments). Build concept map: purpose, key concepts, public surface, dependencies, edge cases, design decisions.
4. **Generate** — Fill gaps in priority order: reference > how-to > explanation > tutorial. Write inline updates to README/ARCHITECTURE/CONTRIBUTING. Create standalone `docs/` files for deep content.
5. **Drift check** — Compare ASCII architecture diagrams against actual module boundaries. Flag drift. Update or annotate.
6. **Clean up** — Polish CHANGELOG section with sell-test rubric (is this for users or maintainers?). Mark TODOs as done where applicable.
7. **Commit** — Commit documentation changes with structured message: `docs: {summary} — {N} files updated, {M} new, {diataxis coverage}%`.

## Routing

| Outcome | Route |
|---------|-------|
| pass | → oh-retro (continue pipeline) |
| fail | → oh-builder (fix issues) |
| blocker | → surface |
