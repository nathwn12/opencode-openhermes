---
name: oh-grill
description: "Stress-test plans and designs through relentless Socratic questioning. Sharpens assumptions, flags blind spots, updates domain docs."
tier: 3
benefits-from: [oh-expert, oh-planner]
triggers:
  - "stress test this plan"
  - "challenge this plan"
  - "grill me on this"
  - "poke holes in this plan"
  - "interrogate this plan"
  - "stress test this design"
route:
  pass: oh-planner
  fail: oh-expert
  blocker: surface
---

# oh-grill

Stress-tests plans and designs through relentless Socratic questioning. Two modes: plain interrogate (quick) or interrogate + update domain docs (thorough).

## When to Use
Before committing to a plan or design. When the user says "it is writing exactly what I asked for and it is still wrong" — the design concept is not shared yet. Cheaper to resolve in conversation than in code.

## Modes

### Mode A: Grill (quick)
Challenge the plan without touching files.

1. Read the plan or design doc
2. Interview the user one decision at a time — each answer reveals new branches
3. Resolve each branch before moving on
4. Surface: contradictions, blind spots, unstated assumptions, ambiguous terms
5. Propose a recommended answer for each decision
6. Output: verified, stress-tested plan with flagged ambiguities

### Mode B: Grill with Docs (thorough)
Same as Mode A, but persists decisions to CONTEXT.md and ADRs, and extracts a DDD ubiquitous-language glossary.

1. Load existing CONTEXT.md and ADRs
2. Grill through the decision tree — each resolved decision may:
   - Update CONTEXT.md domain terms (sharpen fuzzy language)
   - Create a new ADR for architectural decisions
   - Flag an ambiguity in the domain glossary
3. **Ubiquitous Language extraction** — after the decision tree resolves, scan the conversation for domain-relevant nouns, verbs, and concepts:
   - Identify problems: same word for different concepts (ambiguity), different words for same concept (synonyms), vague or overloaded terms
   - Propose a canonical glossary with grouped tables (by subdomain, lifecycle, or actor)
   - Write an example dialogue (3-5 exchanges) between dev and domain expert showing natural term usage
   - Write flagged ambiguities section
4. Persist changes to CONTEXT.md immediately as language firms up
5. Output: updated CONTEXT.md + new ADRs + UBIQUITOUS_LANGUAGE.md (if significant terms emerged) + verified plan with resolution trail

## Technique

- Ask one question at a time
- Propose a recommended answer for each decision
- Walk the full decision tree before accepting the design
- Reference domain glossary from CONTEXT.md when terms are ambiguous
- Cross-reference with existing ADRs when architecture is at stake

## When NOT to Use
- When you already have a clear, vetted plan and need execution
- When the user needs a builder, not a critic
- For trivial decisions that don't change the design's shape

## Anti-patterns
- Grilling for the sake of grilling (redundant with existing reviews)
- Asking questions you could answer by reading the plan or codebase
- Creating ADRs for trivial decisions (not every choice is architecture)
- Polishing CONTEXT.md prose before concepts are settled
- Updating domain terms mid-discussion — let the conversation resolve first
- Not distinguishing between "must resolve now" vs "figure out later"

## Routing

| Outcome | Route |
|---------|-------|
| pass | → oh-planner (revise plan based on feedback) |
| fail | → oh-expert (resolve confusion or blind spot) |
| blocker | → surface to user |
