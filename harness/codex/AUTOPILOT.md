# OpenHermes Autopilot

The closed-loop auto-routing engine. Every task auto-classifies, auto-routes, and auto-chains. Only stop for genuine blockers.

## Auto-Classify

Before any substantive response, classify the task using this decision matrix:

| Signal | Classification | Action |
|---|---|---|
| Multi-step, vague, aimless, "improve", "make better", "fix up", "clean up", "organize", no clear deliverable | PLANNING NEEDED | Load **oh-planner** (Mode A brainstorm or Mode C structured plan). Do not ask. |
| Bug, crash, regression, unexpected behavior, "why is X broken" | INVESTIGATION NEEDED | Load **oh-investigate**. Do not ask. |
| UI, frontend, design system, page, component, dashboard, visual, redesign, theme, layout, "make it look good" | UI PIPELINE NEEDED | Load **oh-facade** (5-phase: Concept → Design System → Build → Audit → Iterate). Do not ask. |
| Security concern, vulnerability, threat model | SECURITY NEEDED | Load **oh-security**. Do not ask. |
| Code quality, performance, linting, dead code | HEALTH CHECK | Load **oh-health**. Do not ask. |
| Full pipeline: plan+implement+test+ship | PIPELINE NEEDED | Load **oh-manifest**. Do not ask. |
| Full pipeline with UI components | PIPELINE + UI | Load **oh-manifest**. It delegates UI work to **oh-facade** internally. |
| Code review, design review, PR review | REVIEW NEEDED | Load **oh-review**. Do not ask. |
| Plan review, architecture review | PLAN REVIEW | Load **oh-plan-review**. Do not ask. |
| Single concrete request with clear scope (rename, format, simple edit) | DIRECT EXECUTION | Execute directly or load **oh-builder**. Do not ask. |
| Session ending, handoff, context switch | HANDOFF | Load **oh-handoff**. Do not ask. |
| Skill import, ingestion, fusion, porting, "make this OH-native", "add this skill" | SKILL INGESTION NEEDED | Load **oh-fusion** (6-phase: Discovery → Analysis → Decision → Adaptation → Fusion → Integration). Do not ask. |
| Diagnostic of own behavior (sycophancy, hallucination check) | SELF-DIAGNOSIS | Load **oh-expert**. Do not ask. |

**When in doubt between two classifications, choose the more structured one.** If a task could be direct execution OR planning needed, load oh-planner. The planner can always determine that the task is simpler than expected and route back.

## Auto-Route

After every skill completes, follow this protocol:

1. **Check the skill's routing table** (defined in its SKILL.md Routing section, or the canonical graph in `harness/codex/ROUTING.md`)
2. **Determine outcome**: pass (completed successfully), fail (found issues or partial results), blocker (unrecoverable)
3. **Route immediately** to the next skill based on outcome
4. **Repeat** until blocker or completion

**Routing is mandatory. It is not optional.** You do not ask "should I route to X?" You determine the outcome and follow the routing table. The routing graph in ROUTING.md is the authority. Do not deviate from it.

### Core Loop

```
oh-planner ──pass──→ oh-grill ──pass──→ oh-planner (revise) ──→ oh-manifest
              fail──→ oh-planner (revise gaps)

oh-manifest ──→ oh-planner → oh-builder → oh-gauntlet → oh-ship → oh-retro → oh-planner
                 ↑_____________________________|              |
                 |                                             ↓
                 └───────── oh-expert ←───────────────── fail

oh-investigate ──pass──→ oh-builder ──→ oh-gauntlet
                  fail──→ oh-expert ──→ oh-investigate (re-diagnose)
```

## Close the Loop

Every skill must route somewhere. No leaf nodes. The only intentional terminal is `oh-handoff` (session end).

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
If the same skill is visited 3+ times in one chain, or 5+ hops pass without producing a new artifact — STOP, write OptiRoute report to `.opencode/plan.md`, surface to user. Do not keep looping.

### Question Gate
Before routing, check: "Can I proceed without guessing?" If the next skill's input is missing and you cannot create or discover it independently — surface to user. Do not route into guaranteed failure.
