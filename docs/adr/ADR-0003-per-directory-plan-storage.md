# ADR-0003: Per-Directory Plan Storage

**Status**: Accepted
**Date**: 2026-05-19

## Context

Plans needed a persistent storage strategy. Two candidates:

- **SHA-1 hash names**: `plan-a1b2c3d4.md` — flat namespace, no ordering, no human meaning.
- **Structured directories**: `~/.local/share/openhermes/plans/<project>/plan-{nnn}.md` — ordered, scoped by project, human-readable.

Requirements: sequential reviewability, easy listing, status tracking, and project scoping.

## Decision

Store plans at:

```
~/.local/share/openhermes/plans/<project>/plan-{nnn}.md
```

Where `{nnn}` is zero-padded sequential numbering (001, 002, 003…). Status lifecycle:
- Keep `active` / `in-progress` plans on disk
- Delete `complete` / `abandoned` plans
- Bootstrap does NOT auto-create plan files (prevents ghost skeletons)

## Consequences

- **Positive**: Human-readable, sequentially reviewable — directory listing acts as natural index.
- **Positive**: Project-scoped — multiple projects don't collide.
- **Positive**: Sequential numbering makes it easy to reference plans by number in conversation.
- **Negative**: Requires file I/O for every plan operation.
- **Negative**: Sequential numbering requires coordination to avoid conflicts.
