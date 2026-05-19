# ADR-0005: Hook System Design

**Status**: Accepted
**Date**: 2026-05-19

## Context

The bootstrap plugin needed extensibility points without modifying core code. A flat callback array would be simple but fragile — no ordering guarantees, no lifecycle awareness, no way to control when hooks fire relative to each other.

Requirements:
- Multiple plugins must be able to register hooks without conflicts
- Execution order must be deterministic and controllable
- Hooks must fire at specific points in the agent lifecycle
- Built-in hooks needed for core functionality

## Decision

4 hook types across 3 phases:

**Hook types**:
- `PreTool` — before tool execution
- `PostTool` — after tool execution
- `Route` — during routing decisions
- `Session` — at session boundaries

**Phases** (within each hook type):
- `EARLY` — high-priority, runs first
- `NORMAL` — standard priority
- `LATE` — low-priority, runs last

**Ordering**: Hooks are priority-sorted within each phase. Lower priority number runs first.

**7 built-in hooks**: confidence-gate, delegation-depth, dynamic-route, next-route, plan-check, route-tracking, shell-detect.

## Consequences

- **Positive**: Flexible plugin extensibility — new behavior without modifying core.
- **Positive**: Deterministic ordering via priority sorting within phases.
- **Positive**: 4 hook types cover the major agent lifecycle touchpoints.
- **Negative**: Hooks must be registered before use — late registration is ignored.
- **Negative**: Priority numbering requires coordination between plugins to avoid conflicts.
- **Negative**: Debugging hook interactions can be complex when multiple plugins are active.
