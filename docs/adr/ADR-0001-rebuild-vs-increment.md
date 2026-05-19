# ADR-0001: Rebuild v3→v4

**Status**: Accepted
**Date**: 2026-05-19

## Context

The project started as a memory-tools plugin (v1–v3) with OHC compression. After three major versions, the architecture had accumulated significant complexity from incremental additions. The codebase mixed memory-tool concerns with nascent orchestration logic. Two paths existed: continue patching the existing architecture with incremental fixes, or clean-sheet rebuild as a full skill-harness platform.

Key constraints:
- The platform vision demanded 30+ skills and 17+ agent types — far beyond the original scope
- Existing users depended on v3 stability
- Team bandwidth allowed only one major direction

## Decision

Clean-sheet rebuild into a 30-skill, 17-agent harness platform with:
- Routing engine for skill dispatch
- Hooks system for plugin extensibility
- Canonical plan storage with sequential naming
- Fragment-based prompt composition

No backward compatibility with v3 memory-tools internals.

## Consequences

- **Positive**: Fundamentally better foundation for the platform vision. Clean separation between routing, hooks, plans, and composition. Easier to test each subsystem independently.
- **Positive**: Ability to onboard new skill types and agent roles without fighting legacy constraints.
- **Negative**: Temporary disruption of ongoing work — existing v3 features had to be re-implemented.
- **Negative**: Migration cost for any v3 users adopting the new platform.
