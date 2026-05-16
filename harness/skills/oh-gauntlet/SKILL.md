---
name: oh-gauntlet
description: "Use when code is ready for thorough testing — unit tests, integration, edge cases, dual-axis review, and QA. Loops until done or blocker."
tier: 4
format: chunked
sections:
  01-test-suite: "Stage 1 — Test Suite: TDD verification, rationalization table, red flags, checklist"
  02-review-and-sweep: "Stages 2-3 — Dual-Axis Review (parallel Standards + Spec) and Edge Case Sweep"
  03-qa-and-canary: "Stages 4-6 — QA Sweep, Canary (post-deploy), Manual Verification"
  04-reference: "Loop Protocol, Anti-patterns, Routing table"
benefits-from: [oh-expert, oh-builder]
triggers:
  - "run the gauntlet on"
  - "test everything"
  - "rigorous testing"
  - "review all angles"
  - "qa the feature"
  - "full review of the code"
  - "validate this feature"
  - "thorough testing"
route:
  pass: oh-ship
  fail: oh-builder
  blocker: surface
---

# oh-gauntlet

Multi-axis testing: test suite, dual-axis review, edge case sweep, QA, canary. Parallel where possible. Loops until all pass or blocker.

**This skill is chunked.** Read this index, pick the section you need, and `read()` only that section file.

## Section Index

| # | Section | Covers |
|---|---------|--------|
| 1 | [Test Suite](./sections/01-test-suite.md) | Stage 1 — TDD verification, rationalization table, red flags, checklist |
| 2 | [Review & Sweep](./sections/02-review-and-sweep.md) | Stages 2-3 — Dual-Axis Review and Edge Case Sweep |
| 3 | [QA & Canary](./sections/03-qa-and-canary.md) | Stages 4-6 — QA Sweep, Canary, Manual Verification |
| 4 | [Reference](./sections/04-reference.md) | Loop Protocol, Anti-patterns, Routing |
