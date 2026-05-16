---
name: oh-investigate
description: "Use when debugging any bug, test failure, or unexpected behavior. Finds root cause systematically before attempting fixes."
tier: 2
triggers:
  - "investigate this bug"
  - "debug this"
  - "why is this broken"
  - "root cause"
route:
  pass: oh-builder
  fail: oh-expert
  blocker: surface
format: chunked
sections:
  01-feedback-loop: "Phase 0 — Build a feedback loop: 10 construction methods, sharpen, non-deterministic, cannot build"
  02-iron-law: "The Iron Law — NO FIXES WITHOUT ROOT CAUSE"
  03-workflow: "Full 4-phase Workflow: Root Cause Investigation, Pattern Analysis, Hypothesis & Testing, Implementation"
  04-tracing-and-diagnostics: "Root Cause Tracing technique + Multi-Component Diagnostics (instrumentation at boundaries)"
  05-red-flags-and-rationalizations: "Red Flags (12 STOP thinking patterns) + 3+ Fix Failure Rule + Partner Signal Monitoring + Common Rationalizations"
  06-reference: "Anti-patterns + Routing table"
---

# oh-investigate

Systematic bug diagnosis skill. Build a fast deterministic feedback loop, then follow a strict 4-phase workflow (investigate → pattern → hypothesis → fix). The Iron Law forbids fixes without root cause. Red flags, partner signals, and rationalization traps catch guess-driven debugging before it starts.

**Example:** User reports "login fails silently." You build a feedback loop (curl the endpoint), reproduce the 500, trace backward through the handler, find the null pointer in the auth middleware, write a failing test, fix, verify.

## Sections

| # | Section | Summary |
|---|---------|---------|
| 01 | [sections/01-feedback-loop.md](sections/01-feedback-loop.md) | Phase 0 — Build a feedback loop: 10 construction methods, sharpen, non-deterministic, cannot build |
| 02 | [sections/02-iron-law.md](sections/02-iron-law.md) | The Iron Law — NO FIXES WITHOUT ROOT CAUSE |
| 03 | [sections/03-workflow.md](sections/03-workflow.md) | Full 4-phase Workflow: Root Cause Investigation, Pattern Analysis, Hypothesis & Testing, Implementation |
| 04 | [sections/04-tracing-and-diagnostics.md](sections/04-tracing-and-diagnostics.md) | Root Cause Tracing technique + Multi-Component Diagnostics (instrumentation at boundaries) |
| 05 | [sections/05-red-flags-and-rationalizations.md](sections/05-red-flags-and-rationalizations.md) | Red Flags (12 STOP thinking patterns) + 3+ Fix Failure Rule + Partner Signal Monitoring + Common Rationalizations |
| 06 | [sections/06-reference.md](sections/06-reference.md) | Anti-patterns + Routing table |
