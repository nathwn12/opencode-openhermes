---
name: oh-fusion
description: "Skill ingestion pipeline: discover, analyze, filter, adapt, fuse, and integrate external skills into the OH harness. Use when the user has an existing skill, finds a skill in their .agents/skills, or wants to bring an external capability into OH."
tier: 3
benefits-from: [oh-skill-craft, oh-skills-link, oh-expert]
format: chunked
sections:
  01-discovery: "Source access types (.agents/skills/, npx skills, URL, user path, inline), load confirmation, multi-source"
  02-analysis: "Depth scoring (lines, rules, examples, anti-patterns, workflow steps, routing), overlap, convention check, report template"
  03-decision: "Keep/Fuse/Discard/Ask verdicts, action mapping, tiebreakers (fuse over keep, keep over discard)"
  04-adaptation: "OH-native frontmatter/body structure, adaptation rules (remove emojis, convert paths, add routing), naming validation"
  05-fusion: "Unique concept ID, overlap comparison, conflict resolution, non-concatenative merge architecture, combined naming"
  06-integration: "File creation, AUTOPILOT wiring, routing wiring (auto-routable via frontmatter), AGENTS.md/openhermes.md update, verify"
triggers: ["import skill", "ingest skill", "fuse skill", "merge skills", "port skill", "add skill from", "make this OH-native", "skill fusion", "oh-fusion", "integrate skill", "convert skill", "bring in a skill", "transfer skill", "copy skill", "adopt skill"]
route:
  pass:
    - oh-skills-link
    - oh-skill-craft
  fail: oh-skill-craft
  blocker: surface
---

# oh-fusion

Skill ingestion pipeline: Discover → Analyze → Decide → Adapt → Fuse (opt) → Integrate. Every fused skill wires into AUTOPILOT, ROUTING, and the self-driving engine.
## Sections
| # | Section | Description |
|---|---------|-------------|
| 01 | Discovery | Source access types, load confirmation, multi-source handling |
| 02 | Analysis | Depth scoring, overlap detection, convention check, report template |
| 03 | Decision | Keep/Fuse/Discard/Ask verdicts, action mapping, tiebreakers |
| 04 | Adaptation | OH-native frontmatter/body, adaptation rules, naming convention |
| 05 | Fusion | Unique concepts, merge architecture, combined naming |
| 06 | Integration | File creation, AUTOPILOT/routing/AGENTS.md wiring, verify |
## Anti-Patterns
- Importing without analysis (always run Phase 2)
- Keeping everything — ~50% of external skills is fluff
- Fusing incompatible domains (confusing to model and user)
- Naming after source ("oh-tailwind-v2") instead of capability ("oh-styles")
- Skipping route frontmatter — without it, autopilot can't route
- Overwriting existing routing without checking for collisions
## Routing
| Outcome | Route |
|---------|-------|
| Integration complete | → oh-skills-link (verify discovery) |
| Fusion needs iteration | → oh-skill-craft |
| Analysis: discard | → surface |
| Analysis: ask | → surface with recs |
| Blocker | → surface |
