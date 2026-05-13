---
name: oh-plan
description: "Strategy + architecture review chain for planning complex features"
---

# oh-plan

## When to Use
Before implementing any non-trivial feature or refactor. Produces a reviewed, executable plan.

## Workflow
1. **Strategy review** — challenge premises, identify scope decisions, consider 10x alternatives
2. **Architecture review** — data flow, component boundaries, API surface, state model
3. **Edge case analysis** — error states, concurrency, failure modes, security implications
4. **Plan document** — produce a structured PLAN.md with phases, dependencies, verification steps

## Output
A `PLAN.md` in the project root with: objectives, architecture diagram, implementation phases, test strategy, risk register.

## Anti-patterns
- Skipping strategy review for complex features (architecture mistakes compound)
- Writing plans at wrong granularity — too vague to execute or too detailed to read
- Not including verification steps (how will we know it works?)
