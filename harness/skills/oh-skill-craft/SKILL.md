---
name: oh-skill-craft
description: "Create new agent skills with proper structure, frontmatter, progressive disclosure, and bundled resources. Meta-skill for growing the harness."
tier: 2
benefits-from: [oh-expert]
format: chunked
sections:
  01-structure-and-template: "Skill directory layout harness/skills/oh-name, SKILL.md REFERENCE.md scripts/, frontmatter fields name description tier triggers route, template structure with Wehn to Use Workflow Anti-patterns, field guide for each frontmatter field"
  02-output-and-review: "User-written skills ~/.config/opencode/skills/ survive npm update, name conflict built-in vs user wins, 7 review criteria, description includes triggers under 100 lines tests pass"
  03-eval-iteration: "6-step iteration loop, create test cases evals/evals.json, spawn runs with-skill vs baseline parallel subagents, draft assertione, grade pass rates timing tokens, non-discriminating high-variance tradeoffs, improve generalize don't overfit, loop until satisfied"
  04-description-optimization: "20 eval queries 10 should-trigger 10 should-not-trigger, realistic concrete details near-misses, iterate description against eval set, select winner by precision recall"
triggers:
  - "create a skill"
  - "write a skill"
  - "new skill"
  - "skill-craft"
  - "meta-skill"
  - "add a capability"
route:
  pass: oh-skills-link
  fail: oh-expert
  blocker: surface
---

# oh-skill-craft

Create new agent skills for the OpenHermes harness. Skills load on demand — the unit of progressive disclosure.

## Sections

| # | Section | Content |
|---|---------|---------|
| 01 | [Structure and Template](sections/01-structure-and-template.md) | Skill directory layout, SKILL.md REFERENCE.md scripts/, frontmatter fields (name description tier triggers route), template structure, field guide |
| 02 | [Output Location and Review Checklist](sections/02-output-and-review.md) | User-written skills path, npm update survival, name conflict resolution, 7 review criteria with verification steps |
| 03 | [Eval-Driven Iteration](sections/03-eval-iteration.md) | 6-step loop: create test cases, spawn parallel with-skill vs baseline runs, draft assertions, grade pass rates/timing/tokens, improve and generalize, loop |
| 04 | [Description Optimization](sections/04-description-optimization.md) | 20 eval queries (10 should-trigger, 10 should-not-trigger), realistic concrete near-misses, iterate and test, select best precision/recall |

## Routing

| Outcome | Route |
|---------|-------|
| pass | → oh-skills-link (verify discovery) |
| iteration data | → oh-learn (extract patterns) |
| fail | → oh-expert (diagnose) |
| blocker | → surface |
