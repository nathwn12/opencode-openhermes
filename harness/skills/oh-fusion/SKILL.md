---
name: oh-fusion
description: "Use when the user has an existing skill, finds a skill in their .agents/skills, or wants to bring an external capability into OH as a skill."
tier: 3
route:
  pass:
    - oh-skills-link
    - oh-skill-craft
  fail: oh-skill-craft
  blocker: surface
---

# oh-fusion

Skill ingestion pipeline: Discover → Analyze → Decide → Adapt → Fuse → Integrate.

## Steps

1. Load skill content — read from `.agents/skills/`, `npx skills`, URL, user path, or inline text.
2. Analyze depth — score by lines, concrete rules, examples, anti-patterns, workflow steps, and routing.
3. Detect overlap — compare against existing `oh-*` skills. Report none/partial/complete.
4. Decide verdict — Keep (high signal, no overlap), Fuse (partial overlap, merge DNA), Discard (low/no signal), or Ask (ambiguous).
5. Adapt to OH-native format — remove emojis, convert paths, add routing, preserve unique signal.
6. Fuse if merging — identify unique concepts from each source, resolve conflicts, write one coherent workflow.
7. Integrate — create skill file, wire AUTOPILOT, routing, AGENTS.md, openhermes.md.
8. Verify — route to oh-skills-link to confirm discovery.

## Routing

| Outcome | Route |
|---------|-------|
| Integration complete | → oh-skills-link (verify discovery) |
| Fusion needs iteration | → oh-skill-craft |
| Analysis: discard | → surface |
| Analysis: ask | → surface with recs |
| Blocker | → surface |
