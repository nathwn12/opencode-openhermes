# Mode C: Structured Plan (non-trivial feature)

Use when requirements exist and need a formal plan document to execute from.

## Process — 7 Steps

### 1. Scope Challenge

Before writing anything, challenge the scope:

- **What existing code partially solves it?** — Don't build from scratch if 60% exists.
- **Minimum changes?** — What's the smallest diff that ships the feature?
- **Complexity check:** 8+ files changed is a smell. Flag it. Reconsider the approach.
- **Search check:** For each architecture pattern in your approach, search `{framework} {pattern} built-in`. Flag custom solutions where framework built-ins exist.
- **Completeness check:** AI-assisted completeness is 10-100x cheaper than human teams. Default to full coverage, not minimal.
- **Distribution check:** New artifact types may need pipelines (build, test, deploy, publish). Include them.

### 2. Strategy Review

Challenge premises:
- Is this the right problem to solve?
- Identify scope decisions explicitly (what's in, what's out, why).
- Consider 10x alternatives — what if you solved this completely differently?
- Who owns the outcome? Who reviews?

### 3. Architecture Review

Analyze:
- **Data flow** — where data enters, transforms, exits. Side effects?
- **Component boundaries** — what each module/class/function owns.
- **API surface** — public interfaces, contracts, versioning.
- **State model** — what state exists, where it lives, how it changes.

### 4. Edge Case Analysis

Cover:
- **Error states** — What can fail at each step? What's the recovery?
- **Concurrency** — Race conditions, locking, ordering guarantees.
- **Failure modes** — Partial failure, cascading failure, degradation.
- **Security** — Input validation, auth boundaries, data leakage, injection vectors.

### 5. Dependency Mapping

Map what blocks what:
- Identify parallelizable work streams.
- Note external dependencies (services, libraries, APIs).
- Order phases so nothing blocks on unfinished upstream work.

### 6. Write Plan

Produce a structured artifact with: phases, dependencies, verification steps per phase, and exit criteria. Use the Plan Artifact format (see `05-plan-artifact.md`).

### 7. Self-Review Checklist

After writing the plan but before delivering it, run a quick inline self-review:

1. **Spec coverage** — Skim each requirement from the original request. Can you point to a task that implements it? List any gaps and add missing tasks.
2. **Placeholder scan** — Search the plan for banned patterns: "TBD", "TODO", "implement later", "handle edge cases", "fill in details". Replace every instance with concrete content.
3. **Type consistency** — Do types, method signatures, and property names match across tasks? A function called `clearLayers()` in Task 3 but `clearFullLayers()` in Task 7 is a bug. Fix cross-references.

Fix any issues inline — no need to re-review, just fix and move on. If a spec requirement has no task, add the task.

## Output

Structured plan document with phased breakdown, dependency graph, verification steps, and exit criteria per phase.
