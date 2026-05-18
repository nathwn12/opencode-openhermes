---
name: oh-fusion
description: "Use when the user has an existing skill, finds a skill in their .agents/skills, or wants to bring an external capability into OH as a skill."
tier: 3
route:
  pass: [oh-skill-craft, oh-skills-link]
  fail: surface
  blocker: surface
---

# oh-fusion

Skill fusion pipeline: Discover → Analyze → Verdict → Approval Gate → Integrate.

## Protocol

1. Load skill content — read from `.agents/skills/`, `npx skills`, URL, user path, or inline text.
2. Analyze the source against OH — report `OH gaps`, `OH wins`, and `missed patterns`.
3. Compare overlap — identify the best existing `oh-*` target, if any.
4. Decide with a rubric:
   - **Merge** when the source mainly strengthens an existing OH capability.
   - **Standalone** when the source adds a distinct, reusable capability.
   - **Discard** when the signal is weak or redundant.
5. Produce a fusion report with these sections, in order:
   - `OH gaps`
   - `OH wins`
   - `missed patterns`
   - `merge verdict`
   - `action plan`
   - `approval gate`
6. Resolve from code and prior conversation first. Ask only if a blocker remains.
7. After approval, adapt to OH-native form and route directly to implementation.
8. Verify discovery with `oh-skills-link` when a new or renamed skill is added.

## Merge Rubric

- **Merge into existing `oh-*`** when domain, trigger, and route already exist; the source mostly adds sharper rules, better sequencing, or stronger edge-case handling.
- **Create standalone `oh-*`** when the source introduces a capability with distinct trigger words, workflow, and handoff points.
- **Discard** when the source adds fluff, duplicates OH, or weakens OpenCode/OpenHermes-native operation.

## Routing

| Outcome | Route |
|---------|-------|
| Approved merge or standalone plan | → oh-skill-craft |
| New or renamed skill needs discovery check | → oh-skills-link |
| Analysis: discard | → surface |
| Approval not yet granted | → surface |
| Blocker | → surface |

## Route evidence

When this skill completes, emit `ROUTE_EVIDENCE:` as a JSON line in the output.
Use this shape:
- `outcome`: pass | fail | blocker
- `target`: prefer `oh-skills-link` if the merged/standalone skill needs discovery verification; prefer `oh-skill-craft` if further skill development is needed
- `verification`: "verified" if post-approval integration steps were run and confirmed, "unverified" otherwise
- `action`: "done" if complete, "fixable" if the integration plan has open items
- `work`: "implement" if skill crafting is still needed, "verify" if only discovery checks remain
- `reason`: short explanation
