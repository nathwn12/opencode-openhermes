---
name: oh-architect
description: "Codebase health analysis — find deepening opportunities for improvement"
---

# oh-architect

## When to Use
When the codebase feels messy, modules are tightly coupled, or you want to find the highest-leverage refactoring opportunities.

## Workflow
1. **Read the domain** — load CONTEXT.md, understand the language
2. **Map the surface** — identify modules, their boundaries, and dependencies
3. **Find deepening opportunities** — look for:
   - Duplicated logic that should be unified
   - Modules that know too much about each other
   - Functions that have grown beyond their original purpose
   - Missing abstractions (repeated patterns not extracted)
4. **Rank by impact** — effort vs value, dependencies, risk
5. **Propose changes** — specific refactors with expected outcomes

## Anti-patterns
- Refactoring for theoretical purity (if it ain't hurting, don't fix it)
- Big bang rewrites (refactor incrementally, ship often)
- Ignoring the domain language (architecture should speak the business language)
