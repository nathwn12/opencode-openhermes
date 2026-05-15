# OpenHermes Autopilot

The closed-loop auto-routing engine. Every task auto-classifies, auto-routes, and auto-chains. Only stop for genuine blockers.

## Plan Pre-condition (Before Classification)

Before any classification or execution, verify a plan file exists at:
`~/.local/share/opencode/openhermes/plans/<project-name>-plan-<nnn>.md`

Logic:
- No plan exists → create one (Status: active)
- Latest plan is complete/abandoned → create the next sequential plan
- Latest plan is active/in-progress → reuse it

This is non-negotiable. If the plan condition is not satisfied, do not proceed to classification.

## Auto-Classify

Before any substantive response, classify the task using this decision matrix:

| Signal | Classification | Action |
|---|---|---|
| Multi-step, vague, aimless, "improve", "make better", "fix up", "clean up", "organize", "I have an idea", no clear deliverable | PLANNING NEEDED | Load **oh-planner** (Mode A brainstorm or Mode C structured plan). Do not ask. |
| Bug, crash, regression, unexpected behavior, "why is X broken" | INVESTIGATION NEEDED | Load **oh-investigate**. Do not ask. |
| UI, frontend, design system, page, component, dashboard, visual, redesign, theme, layout, "make it look good", "janky", "laggy", "slow UI", UI quality complaint | UI PIPELINE NEEDED | Load **oh-facade** (5-phase: Concept → Design System → Build → Audit → Iterate). Do not ask. |
| Security concern, vulnerability, threat model | SECURITY NEEDED | Load **oh-security**. Do not ask. |
| Code quality, performance, linting, dead code | HEALTH CHECK | Load **oh-health**. Do not ask. |
| ASCII diagram, box drawing, diagram alignment, architecture diagram, PlantUML, "make a diagram", diagram validation | ASCII DIAGRAM NEEDED | Load **oh-ascii** (Design + Generate + Validate). Do not ask. |
| Full pipeline: plan+implement+test+ship | PIPELINE NEEDED | Load **oh-manifest**. Do not ask. |
| Full pipeline with UI components | PIPELINE + UI | Load **oh-manifest**. It delegates UI work to **oh-facade** internally. |
| Code review, design review, PR review | REVIEW NEEDED | Load **oh-review**. Do not ask. |
| Plan review, architecture review | PLAN REVIEW | Load **oh-plan-review**. Do not ask. |
| Single concrete request with clear scope (rename, format, simple edit) | BUILDER NEEDED | Load **oh-builder**. Do not ask. |
| Session ending, handoff, context switch | HANDOFF | Load **oh-handoff**. Do not ask. |
| Skill import, ingestion, fusion, porting, "make this OH-native", "add this skill" | SKILL INGESTION NEEDED | Load **oh-fusion** (6-phase: Discovery → Analysis → Decision → Adaptation → Fusion → Integration). Do not ask. |
| Diagnostic of own behavior (sycophancy, hallucination check) | SELF-DIAGNOSIS | Load **oh-expert**. Do not ask. |

**When in doubt between two classifications, choose the more structured one.** If a task could be simple work OR planning needed, load oh-planner. The planner can always determine that the task is simpler than expected and route back.

## Auto-Route

After every skill completes, follow this protocol:

1. **Determine outcome**: pass (completed successfully), fail (found issues or partial results), blocker (unrecoverable)
2. **Read the skill's `route:` frontmatter** — every SKILL.md has `route.pass`, `route.fail`, and `route.blocker` values
3. **Route immediately** to the next skill based on outcome and the skill's own routing metadata
4. **Repeat** until blocker, completion (`done`), or surface (`surface`)

**Routing is mandatory. It is not optional.** You do not ask "should I route to X?" You determine the outcome and follow the skill's routing metadata. Do not deviate from it.

### Route Values

Every skill's `route:` frontmatter uses these value types:

| Value | Meaning |
|-------|---------|
| `oh-<name>` | Route to a specific skill (built-in or user) |
| `[oh-a, oh-b]` | Route to one of — choose the best fit for current context |
| `surface` | Report findings to the user and end the chain |
| `done` | Task is complete — terminal |
| `mode` | Internal mode switch — return to the calling skill after toggling state |

### Routing Flow (per step)

1. Verify plan exists (create if needed)
2. Classify task using decision matrix
3. Load best matching skill
4. Execute the skill
5. Read the skill's `route:` frontmatter (pass/fail/blocker)
6. Route by outcome → go to step 3, or surface/done/blocker
7. Report to user

User skills participate identically: their `route:` frontmatter drives routing the same way. No registration needed.

## Close the Loop

Every skill must route somewhere. No leaf nodes (task-level terminals use `done`; the only session-ending terminal is `oh-handoff`).

- If a chain completes (pass all the way through) and the task has more work → start a new auto-classify cycle
- If a chain completes and the task is done → summarize with receipts, present results
- If a blocker fires → surface to user with findings, options, and what you need

## Stop Conditions

**STOP only for:**

1. **Task complete** — requested work is done, verified, evidence presented. Do not keep routing after the goal is met.
2. **Blocker** — unrecoverable error, missing information you cannot discover yourself, environment prevents progress. Surface with:
   - What you tried
   - Where you got stuck
   - What you need to proceed
3. **Major decision** — a genuinely ambiguous choice where either path materially changes the outcome (language choice, architecture paradigm, tool selection). Surface options with analysis. Do not ask about trivial choices.

**Do NOT stop for:**
- "Should I plan first?" — Task is multi-step or aimless? Load oh-planner. Do not ask.
- "Should I continue?" — Not blocked? Continue. Do not ask.
- "Which skill should I use?" — Auto-classify table tells you. Do not ask.
- "Is this OK?" — Verify and present evidence. Do not ask.
- "Do you want me to X?" — If X is the next routing step, just do it. Do not ask.

## Safety Valves

### Loop Guard
If the same skill is visited 3+ times in one chain, or 5+ hops pass without producing a new artifact — STOP, write OptiRoute report to the plan file, surface to user. Do not keep looping.

### Question Gate
Before routing, check: "Can I proceed without guessing?" If the next skill's input is missing and you cannot create or discover it independently — surface to user. Do not route into guaranteed failure.

## User Skills

Skills in `~/.agents/skills/` and `~/.config/opencode/skills/` are auto-discovered on every session. On name conflict with a built-in `oh-*` skill, the user version wins. User skills survive `npm update openhermes`.

### User skills in the routing loop

User skills are **first-class routing citizens**. The autopilot treats them identically to built-in skills:

- **They appear in the available skills list** and can be loaded through the skill tool on demand
- **Their `route:` frontmatter drives routing** — after a user skill completes, the autopilot reads its `route.pass`/`route.fail`/`route.blocker` and routes to the next skill
- **Any skill can route to a user skill** — if a built-in skill's `route.pass` points to `oh-deploy` (user skill), the autopilot routes there
- **No registration step** — add `route:` frontmatter to any skill file and it participates in the routing graph automatically
