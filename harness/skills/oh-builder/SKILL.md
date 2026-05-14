---
name: oh-builder
description: "ALL-arounder builder — prototype, TDD, implement from plan, design interfaces. Consumes plan.md, produces working code."
tier: 4
benefits-from: [oh-planner, oh-expert]
triggers:
  - "build this"
  - "implement"
  - "write the code"
  - "prototype"
  - "tdd"
  - "red-green"
  - "design an interface"
  - "implement phase"
---

# oh-builder

The ALL-arounder builder. Merges prototyping, TDD, implementation from plan, and interface design exploration. Consumes `.opencode/plan.md` from oh-planner or works standalone.

## Entry Modes

### Mode A: Prototype (exploratory)
When you need to answer a question before committing.

1. Determine what question the prototype answers (data model, state flow, UI direction)
2. Build minimal — just enough to answer the question
3. Let user play with it
4. Collect feedback
5. Decide: discard, iterate, or promote

**Sub-modes:**
- **Terminal** — for state/business logic questions
- **UI** — several radical design variations from one route

### Mode B: TDD (test-first implementation)
When building production code from a plan or spec. Red-green-refactor with vertical tracer bullets.

**Planning** (one-time):
- [ ] Confirm interface changes with user
- [ ] Prioritize behaviors to test
- [ ] Design for testability (public interface only)
- [ ] List behaviors, not implementation steps

**Loop** (repeat per behavior):
```
RED:   Write one test → fails
GREEN: Minimal code to pass → passes
```

**Rules:**
- One test at a time
- Only enough code to pass current test
- Do not anticipate future tests
- Tests describe behavior through public interfaces, not implementation details
- Never refactor while RED

**Refactor** (after all GREEN):
- Extract duplication
- Deepen modules (complexity behind simple interfaces)
- Run tests after each refactor step

### Mode C: Design an Interface (exploration)
When the interface shape is uncertain. "Design it twice" — generate multiple radically different designs, then compare.

1. **Gather requirements** — problem, callers, key operations, constraints
2. **Spawn 3+ parallel sub-agents** — each with a different constraint:
   - Agent 1: "Minimize method count — aim for 1-3 methods max"
   - Agent 2: "Maximize flexibility — support many use cases"
   - Agent 3: "Optimize for the most common case"
   - Agent 4: "Take inspiration from [specific paradigm]"
3. **Present designs** — interface signature, usage examples, what it hides
4. **Compare** — simplicity, generality, implementation efficiency, depth
5. **Synthesize** — combine insights from multiple options

### Mode D: From Plan (plan.md exists)
When oh-planner produced a plan artifact. Execute phases in order.

1. Read `.opencode/plan.md`
2. For each phase: implement per plan spec using TDD discipline (Mode B)
3. Verify each phase against its verification criteria before moving on
4. Update `.opencode/plan.md` with completed phase status

## Anti-patterns
- Polishing a prototype ("it's just a prototype!" — it never is)
- Writing all tests first (horizontal slicing) — produces brittle, imaginary tests
- Anticipating future tests — write for what exists now
- Refactoring while RED — get to GREEN first
- Letting sub-agents produce similar designs — enforce radical difference
- Implementing without verifying against plan criteria
