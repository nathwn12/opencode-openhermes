---
name: oh-grill
description: "Use when a plan or design needs stress-testing before implementation. Sharpens assumptions and flags blind spots through Socratic questioning."
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

Stress-tests plans through relentless Socratic questioning. Two modes.

## When to Use
Before committing to a plan. "Writing exactly what I asked for and it's still wrong" = design concept not shared. Cheaper in conversation than in code.

**Example:** User shares a plan. You respond with: "Have you considered the failure mode where X happens?" — then walk through the grill modes.

## Modes

### Mode A: Grill (quick)
1. Read plan/design doc
2. Interview one decision at a time — each answer reveals new branches
3. Resolve each branch before moving on
4. Surface: contradictions, blind spots, unstated assumptions, ambiguous terms
5. Propose recommended answer per decision
6. Output: verified plan with flagged ambiguities

### Mode B: Grill with Docs (thorough)
Same + persists to CONTEXT.md, ADRs, and DDD ubiquitous-language glossary.

1. Load CONTEXT.md + ADRs
2. Grill decision tree — each resolution may: update CONTEXT.md terms, create ADR, flag glossary ambiguity
3. **Ubiquitous Language extraction** — scan for domain nouns/verbs/concepts. Identify: same word different concepts, different words same concept, vague terms. Propose canonical glossary with grouped tables. Write example dialogue (3-5 exchanges). Flag ambiguities.
4. Persist CONTEXT.md changes immediately as language firms
5. Output: updated CONTEXT.md + ADRs + UBIQUITOUS_LANGUAGE.md (if significant) + verified plan

## Technique
- One question at a time
- Propose recommended answer per decision
- Walk full decision tree before accepting
- Reference CONTEXT.md glossary for ambiguous terms
- Cross-reference ADRs for architecture decisions

## When NOT to Use
- Clear vetted plan needing execution
- User needs builder, not critic
- Trivial decisions

## Anti-patterns
- Grilling for sake of grilling
- Questions you could answer by reading plan/codebase
- ADRs for trivial decisions
- Polishing CONTEXT.md before concepts settled
- Updating terms mid-discussion (let conversation resolve)
- Not distinguishing "must resolve now" vs "figure out later"

## Routing

| Outcome | Route |
|---------|-------|
| pass | → oh-planner (revise plan) |
| fail | → oh-expert (resolve blind spot) |
| blocker | → surface |
