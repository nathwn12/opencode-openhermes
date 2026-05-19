---
name: eng
weight: 0.3
focus: architecture, data flow, edge cases
scoring:
  10: "Clean architecture, well-modularized, all edge cases handled, testable"
  8: "Solid architecture, minor edge cases unaddressed, good module boundaries"
  6: "Architecture is unclear, module boundaries are fuzzy, significant edge cases"
  4: "Architecture won't scale, tight coupling, critical edge cases ignored"
  0: "Architecture is unworkable or missing"
---

# Engineering Lens

Architecture perspective: does this plan hold up under implementation?

## Questions

1. **Data flow** — Where does data enter, transform, and exit? Trace end-to-end.
2. **Module boundaries** — Are responsibilities clearly separated? What depends on what?
3. **State model** — What state exists? Where is it persisted? What are the transitions?
4. **Edge cases** — Error handling, concurrency, failure modes, security boundaries.
5. **API surface** — If this exposes an interface, is it coherent? Minimal? Backward-compatible?
6. **Testability** — Can each component be tested independently? What makes it hard?

## Output

- Architecture assessment (sound / needs work / broken)
- Risk matrix (data flow | state | security | performance)
- Score 0-10 with justification
- Recommended architecture diagram amendments
