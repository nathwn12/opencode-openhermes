---
name: oh-builder
description: "Use when you need to build something from a plan, prototype an idea, implement code via TDD, or design an interface. Consumes plan artifacts and produces working code."
tier: 4
benefits-from: [oh-planner, oh-expert]
triggers:
  - "build this"
  - "implement this phase"
  - "write the code for"
  - "prototype"
  - "tdd"
  - "red-green"
  - "design an interface"
  - "implement the feature"
  - "build the component"
route:
  pass: oh-gauntlet
  fail: oh-builder
  blocker: surface
---

# oh-builder

ALL-arounder builder. Prototyping, TDD, plan implementation, interface design. Consumes plan file from oh-planner or works standalone.

## Entry Modes

### Mode A: Prototype (exploratory)
Pick branch by question:
- **"Does this logic feel right?"** → Terminal branch. Tiny interactive app pushing state machine.
- **"What should this look like?"** → UI branch. Multiple visual variations switchable via param/control bar.

**Rules:** Throwaway from day one (clear name). One command to run. No persistence (memory state). Skip polish (no tests, minimal error handling). Surface state after every action. Delete/absorb answer when done.

### Mode B: TDD (test-first)
Red-green-refactor with vertical tracer bullets.

**Plan:** Confirm interface changes with user. Prioritize behaviors. Design for testability (public interface only). List behaviors, not implementation steps.

**Loop** per behavior:
```
RED:   One test → fails
GREEN: Minimal code → passes
```

**Rules:** One test at a time. Only enough code to pass. Don't anticipate future tests. Tests through public interfaces. Never refactor while RED.

**Refactor** (all GREEN): Extract duplication, deepen modules, re-run tests after each step.

### Mode C: Design an Interface
"Design it twice" — generate multiple radically different designs, compare.

1. Gather requirements (problem, callers, operations, constraints)
2. Spawn 3+ parallel sub-agents with different constraints (min methods, max flexibility, optimize common case, specific paradigm)
3. Present designs (signature, examples, what it hides)
4. Compare (simplicity, generality, efficiency, depth)
5. Synthesize insights

### Mode D: From Plan
Plan exists → execute phases in order.

1. Read plan file
2. Each phase: implement per spec using TDD (Mode B)
3. Verify against criteria before moving on
4. Update plan with completed status

## Anti-patterns
- Polishing a prototype
- Writing all tests first (brittle, imaginary)
- Anticipating future tests
- Refactoring while RED
- Sub-agents producing similar designs (enforce radical difference)
- Implementing without verifying against plan criteria

## Routing

| Outcome | Route |
|---------|-------|
| pass | → oh-gauntlet |
| fail | → oh-builder (fix issues) |
| blocker | → surface |
