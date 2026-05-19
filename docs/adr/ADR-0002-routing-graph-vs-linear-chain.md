# ADR-0002: Skill Routing Graph

**Status**: Accepted
**Date**: 2026-05-19

## Context

Skills needed a dispatch mechanism to chain operations, handle failures, and support complex workflows. Two dominant patterns existed:

- **Linear chain**: Execute step 1 → step 2 → step 3. Simple, deterministic, easy to debug.
- **Routing graph**: Each skill declares pass/fail/blocker routes. Dispatch resolves dynamically based on outcome and evidence.

The platform needed to support failure isolation, parallel execution, and evidence-driven branching — none of which linear chains handle naturally.

## Decision

Use a routing graph where each `SKILL.md` declares routes in frontmatter:

```yaml
route:
  pass: "next-skill"
  fail: "fallback-skill"
  blocker: "surface"
```

With additional mechanisms:
- `NEXT_ROUTE` environment variable for dynamic overrides
- `ROUTE_EVIDENCE` for evidence-guided resolution
- All blocker targets route unconditionally to `"surface"`

## Consequences

- **Positive**: Supports parallelism, failure isolation, and evidence-driven routing.
- **Positive**: Adding a new skill is declarative — just add frontmatter routes.
- **Negative**: More complex dispatch logic than a linear chain.
- **Negative**: Routing graph must be validated for orphans, cycles, and self-loops at load time.
