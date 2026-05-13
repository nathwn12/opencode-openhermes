---
name: oh-grill-with-docs
description: "Stress-test a plan while building CONTEXT.md and ADRs inline"
---

# oh-grill-with-docs

## When to Use
When stress-testing a plan against the existing domain model. Challenges your plan against CONTEXT.md and sharpens terminology as decisions crystallise.

## Workflow
1. Load existing CONTEXT.md and ADRs
2. Grill through the decision tree — each resolved decision may:
   - Update CONTEXT.md domain terms
   - Create a new ADR
   - Flag an ambiguity
3. Persist changes to CONTEXT.md immediately as language firms up
4. Create ADRs for architectural decisions made during grilling
5. Output: updated CONTEXT.md + new ADRs + verified plan

## Anti-patterns
- Creating ADRs for trivial decisions (not every choice is architecture)
- Polishing CONTEXT.md prose before concepts are settled
- Updating terms mid-discussion (let the conversation resolve first)
