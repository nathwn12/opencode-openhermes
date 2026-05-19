# ADR-0004: Composer Fragment Architecture

**Status**: Accepted
**Date**: 2026-05-19

## Context

The OpenHermes agent prompt needed to be composable, testable, and maintainable — a single monolithic prompt file would be unwieldy at scale. Fragments needed clear boundaries, independent editability, and phase awareness.

Requirements:
- Each fragment should be independently editable and testable
- Assembly order must be explicit and controlled
- Fragments should support phase filtering (some content only applies during certain phases)
- Path traversal attacks on fragment includes must be prevented

## Decision

9 numbered fragments in `harness/lib/composer/fragments/`:

| # | Fragment | Content |
|---|----------|---------|
| 01 | identity.md | "You are OpenHermes…" |
| 02 | delegation.md | Enforced delegation behavior |
| 03 | permissions.md | Permission matrix |
| 04 | task-flow.md | Task flow steps |
| 05 | confidence.md | Stop conditions |
| 06 | parallelization.md | Parallelization rules |
| 07 | shell.md | Shell awareness + confidence gate examples |
| 08 | routing.md | Plan storage |
| 09 | guardrails.md | Guardrails + routing |

Assembled by `compose.ts` with:
- Phase filtering (EARLY / NORMAL / LATE)
- Path traversal sanitization on all fragment references

## Consequences

- **Positive**: Each fragment is independently editable and testable.
- **Positive**: New fragments can be added at any phase position without reordering existing ones.
- **Positive**: Phase filtering enables context-sensitive prompt composition.
- **Negative**: Assembly step adds complexity — must ensure fragments are always in sync with the composed output.
- **Negative**: More files to manage compared to a single prompt file.
