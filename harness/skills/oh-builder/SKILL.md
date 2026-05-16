---
name: oh-builder
description: "Build from plans, prototypes, TDD, or interface design"
tier: 4
route:
  pass: oh-gauntlet
  fail: oh-builder
  blocker: surface
---

# oh-builder

ALL-arounder builder: prototyping, TDD, plan implementation, interface design.

## Steps

1. Detect builder mode from request — prototype, TDD, interface design, or plan-driven
2. If plan file exists, read it and execute phases in order
3. For prototypes: build minimal throwaway app answering the specific question, no polish, surface state after every action
4. For TDD: red-green-refactor per behavior — one test at a time, minimal code to pass, never refactor while red
5. For interface design: spawn 3+ parallel sub-agents with radically different constraints, compare, synthesize insights
6. Verify output against success criteria before routing
7. Route based on outcome

## Routing

| Outcome | Route |
|---------|-------|
| pass | → oh-gauntlet |
| fail | → oh-builder (fix issues) |
| blocker | → surface |
