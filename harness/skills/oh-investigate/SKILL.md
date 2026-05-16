---
name: oh-investigate
description: "Use when debugging any bug, test failure, or unexpected behavior. Finds root cause systematically before attempting fixes."
tier: 2
route:
  pass: oh-builder
  fail: oh-expert
  blocker: surface
---

# oh-investigate

Systematic bug diagnosis: build a feedback loop, trace root cause, fix with evidence.

## Steps

1. Build a feedback loop — failing test, curl, CLI, headless browser, or throwaway harness. Must be fast, deterministic, and agent-runnable.
2. Apply the Iron Law — NO FIXES WITHOUT ROOT CAUSE INVESTIGATION FIRST. Surface fixes compound into technical debt.
3. Reproduce and trace — confirm failure, read stack traces, check recent changes, minimise to failure path, gather evidence one probe per hypothesis.
4. Trace backward — from symptom through call chain to original trigger. Instrument boundaries with debug logging.
5. Find working pattern — locate similar working code, compare against references, list every difference.
6. Form single hypothesis — "I think X is root cause because Y." Test with minimal change. One variable.
7. Implement fix — create failing test first, apply one fix, verify resolution, regression test, document root cause.

## Routing

| Outcome | Route |
|---------|-------|
| pass | → oh-builder (fix) |
| fail | → oh-expert (deepen) |
| blocker | → surface |
