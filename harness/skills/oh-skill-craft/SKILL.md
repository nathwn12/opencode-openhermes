---
name: oh-skill-craft
description: "Use when a new OH skill needs to be created, existing skill needs review against standards, or an external capability should be integrated as a skill. Meta-skill for growing the harness."
tier: 2
route:
  pass: oh-skills-link
  fail: oh-expert
  blocker: surface
---

# oh-skill-craft

Create new agent skills for the OpenHermes harness.

## Steps

1. Create skill directory — `harness/skills/<oh-name>/` with `SKILL.md`. Follow template structure (frontmatter, summary, Workflow, Anti-patterns).
2. Write frontmatter — name (regex `^[a-z0-9]+(-[a-z0-9]+)*$`), description (max 200 chars, "Use when..."), tier (2/3/4), triggers, route.
3. Draft skill body — When to Use, Workflow (numbered steps), Anti-patterns with concrete examples, Routing table.
4. Review against checklist — description includes triggers, SKILL.md under 100 lines, no time-sensitive info, tests pass, consistent oh- prefix.
5. Run eval-driven iteration — create test cases, spawn with-skill vs baseline sub-agents, grade pass rates/timing/tokens, improve and generalize.
6. Optimize description — create 20 eval queries (10 should-trigger, 10 should-not), iterate description against eval set, select best precision/recall.
7. Close loopholes — build rationalization table, create red flags, apply bulletproofing techniques (forbid specific workarounds).

## Routing

| Outcome | Route |
|---------|-------|
| pass | → oh-skills-link (verify discovery) |
| fail | → oh-expert (diagnose) |
| blocker | → surface |
