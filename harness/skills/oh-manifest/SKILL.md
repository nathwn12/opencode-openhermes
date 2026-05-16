---
name: oh-manifest
description: "Use when running a complete implementation pipeline from plan through verification. Orchestrates oh-planner + oh-builder with auto-decisions."
tier: 4
benefits-from: [oh-planner, oh-builder, oh-expert]
format: chunked
sections:
  01-pre-flight: "Phase 0: Pre-Flight — quality baseline, rollback path, branch isolation, scope check. All must pass before any work."
  02-pipeline: "Steps 1-4: Plan (load or oh-planner), Build (dispatch oh-builder, two-stage review, implementer status protocol), Verify, Loop"
  03-patterns-and-decisions: "Loop patterns (sequential, continuous-pr, infinite, rfc-dag), escalation triggers (stall, retry storm, cost drift, quality regression), decision principles"
  04-reference: "Blocker protocol, anti-patterns, routing"
triggers:
  - "run the full build"
  - "full build pipeline"
  - "build loop"
  - "build until done"
  - "orchestrate this build"
  - "pipeline from plan"
  - "run the plan"
  - "manifest this"
route:
  pass: oh-planner
  fail: oh-expert
  blocker: surface
---

# oh-manifest

Full build orchestration loop: pre-flight → plan → build → verify → repeat until done or blocker. Consumes or creates a plan, dispatches builder for each phase, verifies, loops.

**Example:** User says "build this feature." Manifest loads/creates plan, dispatches builder for each phase, verifies, loops until done or blocked.

**This skill is chunked.** Read this index, pick the section you need, and `read()` only that section file.

## Section Index

| # | Section | Covers |
|---|---------|--------|
| 1 | [Pre-Flight](./sections/01-pre-flight.md) | Quality baseline, rollback path, branch isolation, scope check |
| 2 | [Pipeline](./sections/02-pipeline.md) | Plan (load/oh-planner), Build (dispatch, two-stage review, implementer status), Verify, Loop |
| 3 | [Patterns & Decisions](./sections/03-patterns-and-decisions.md) | Loop patterns, escalation triggers, decision principles, model selection |
| 4 | [Reference](./sections/04-reference.md) | Blocker protocol, anti-patterns, routing |
