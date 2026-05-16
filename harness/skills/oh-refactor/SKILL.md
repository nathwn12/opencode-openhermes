---
name: oh-refactor
description: "Use when code is hard to maintain, functions are too long, code smells accumulate, or the user asks to clean up, improve, or refactor code. Behavior-preserving refactoring — extract, deduplicate, simplify, improve types."
tier: 3
benefits-from: [oh-investigate, oh-review]
format: chunked
sections:
  01-golden-rules: "Five golden rules (behavior preserved, small steps, tests essential, one thing per commit, commit between safe states), contraindications for when not to refactor"
  02-workflow: "Five-phase workflow: Prepare (characterization tests + branch), Identify (find smell, plan fix), Refactor (change → test → commit loop), Verify (tests, smoke, diff), Clean Up (dead code, imports, final commit)"
  03-code-smells: "Six code smell patterns with before/after diff examples: Long Method, Guard Clauses, Duplicated Code, Magic Numbers, Primitive Obsession, Feature Envy"
  04-operations: "Common refactoring operations reference table: Extract Method, Extract Class, Rename, Introduce Parameter Object, Guard Clauses, Replace Magic Number, Consolidate Conditional"
  05-checklist: "Quality checklist: function size, duplication, naming, dead code, module boundaries, types, test coverage"
triggers: ["refactor", "clean up", "improve this code", "code smell", "make this better", "extract method", "reduce duplication", "fix this mess", "technical debt", "god function", "long method", "nested conditionals"]
route:
  pass: oh-gauntlet
  fail: [oh-planner, oh-investigate, oh-builder]
  blocker: surface
---

# oh-refactor

Improve code structure without changing external behavior. Gradual evolution, not revolution.
## Sections
| # | Section | Description |
|---|---------|-------------|
| 01 | Golden Rules | Five golden rules (behavior preserved, small steps, tests essential, one thing per commit, commit between safe states), contraindications |
| 02 | Workflow | Five-phase workflow: Prepare, Identify, Refactor (loop), Verify, Clean Up |
| 03 | Code Smells | Six code smell patterns with before/after diff examples |
| 04 | Operations | Common refactoring operations reference table |
| 05 | Checklist | Quality checklist: function size, duplication, naming, dead code, module boundaries, types, tests |

## Anti-patterns
- Refactoring without tests (behavior preservation is unverifiable)
- Mixing behavior changes with refactoring
- "While I'm here" scope creep
- Large batch refactors (commit between safe states)

## Routing
| Outcome | Route |
|---------|-------|
| pass | → oh-gauntlet (test integrity) |
| behavior unclear | → oh-investigate |
| test gap found | → oh-builder (TDD mode) |
| blocker | → surface |
