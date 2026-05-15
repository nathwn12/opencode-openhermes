---
name: oh-builder
description: "ALL-arounder builder — prototype, TDD, implement from plan, design interfaces. Consumes the plan file, produces working code."
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
---

# oh-builder

The ALL-arounder builder. Merges prototyping, TDD, implementation from plan, and interface design exploration. Consumes the plan file from oh-planner or works standalone.

## Entry Modes

### Mode A: Prototype (exploratory)
When you need to answer a question before committing.

**Pick a branch based on the question being asked:**

- **"Does this logic / state model feel right?"** → **Terminal branch.** Build a tiny interactive terminal app that pushes the state machine through cases that are hard to reason about on paper.
- **"What should this look like?"** → **UI branch.** Generate several radically different visual variations, switchable via a URL param or floating control bar.

If the question is genuinely ambiguous, default to whichever branch better matches the surrounding code (backend module → terminal, page/component → UI) and state the assumption.

**Rules that apply to both branches:**

1. **Throwaway from day one, clearly marked.** Name it so a casual reader sees it's a prototype.
2. **One command to run.** Whatever the project's task runner supports — `pnpm <name>`, `bun <path>`, etc.
3. **No persistence by default.** State lives in memory. If the question involves a database, hit a scratch DB with a clear "PROTOTYPE — wipe me" name.
4. **Skip the polish.** No tests, no error handling beyond what makes it runnable. The point is to learn and then delete.
5. **Surface the state.** After every action (terminal) or on every variant switch (UI), show the full relevant state so the user sees what changed.
6. **Delete or absorb when done.** The answer is the only thing worth keeping. Capture it in a commit, ADR, or note — then delete the prototype code.

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

### Mode D: From Plan (plan file exists)
When oh-planner produced a plan artifact. Execute phases in order.

1. Read the plan file ( `~/.local/share/opencode/openhermes/plans/<project-name>-plan-<nnn>.md` )
2. For each phase: implement per plan spec using TDD discipline (Mode B)
3. Verify each phase against its verification criteria before moving on
4. Update plan file with completed phase status

## Anti-patterns
- Polishing a prototype ("it's just a prototype!" — it never is)
- Writing all tests first (horizontal slicing) — produces brittle, imaginary tests
- Anticipating future tests — write for what exists now
- Refactoring while RED — get to GREEN first
- Letting sub-agents produce similar designs — enforce radical difference
- Implementing without verifying against plan criteria

## Routing

| Outcome | Route |
|---------|-------|
| pass | → oh-gauntlet (test built code) |
| fail | → oh-builder (fix issues) |
| blocker | → surface to user |
