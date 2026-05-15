# OpenHermes Routing Graph

Every skill routes to the next based on outcome. No dead ends.

## Routing semantics

Every routing directive uses three outcomes:

| Outcome | Meaning |
|---------|---------|
| **→ pass** | Skill completed its primary mission successfully |
| **→ fail** | Skill found issues, got incomplete results, or cannot satisfy its objective |
| **→ blocker** | Skill hit an unrecoverable obstacle — surface to user immediately |

If a skill has no explicit route for an outcome, the fallback is always **surface to user with findings**.

## Canonical routing table

### Workflow skills
*Includes oh-doctor (command, not skill) for diagnostic routing.*

| Skill | pass | fail | blocker |
|-------|------|------|---------|
| **oh-planner** | → oh-grill (stress-test plan) | → oh-planner (revise gaps) | surface |
| **oh-builder** | → oh-gauntlet (test) | → oh-builder (fix) | surface |
| **oh-gauntlet** | → oh-ship (all pass) | → oh-builder (fix issues) | surface |
| **oh-manifest** | → [pipeline: planner→builder→gauntlet→ship] | → oh-expert (diagnose loop failure) | surface |
| **oh-grill** | → oh-planner (revise based on feedback) | → oh-expert (resolve confusion) | surface |
| **oh-investigate** | → oh-builder (implement fix) | → oh-expert (deepen diagnosis) | surface |
| **oh-expert** | → oh-builder (fix) or oh-gauntlet (re-test) | → oh-expert (re-diagnose) | surface |
| **oh-ship** | → oh-retro (post-ship review) | → oh-expert (diagnose failure) | surface |
| **oh-doctor** | → [report findings to user] | → oh-investigate (diagnose issues) | surface |
| **oh-facade** | → oh-review (design review) or oh-manifest (return to pipeline) | → Phase 5 iterate (fix and re-audit) | surface |
| **oh-fusion** | → oh-skills-link (verify discovery) or oh-skill-craft (optimize) | → oh-skill-craft (iterate via eval loop) | surface |

### Review & analysis skills

| Skill | pass | fail | blocker |
|-------|------|------|---------|
| **oh-review** | → oh-gauntlet (if code changes needed) or oh-ship | → oh-builder (fix violations) | surface |
| **oh-plan-review** | → oh-grill (if concerns) or oh-manifest (execute) | → oh-planner (revise plan) | surface |
| **oh-security** | → [report findings] | → oh-investigate (deepen) | surface |
| **oh-health** | → [report score] | → oh-investigate (deepen) | surface |

### Utility skills

| Skill | pass | fail | blocker |
|-------|------|------|---------|
| **oh-init** | → [done — one-time setup] | → [retry with corrections] | surface |
| **oh-prd** | → oh-issue (break into issues) | → oh-grill (stress requirements) | surface |
| **oh-issue** | → [done — issues published] | → oh-planner (re-spec) | surface |
| **oh-triage** | → oh-issue or oh-handoff | → oh-expert (clarify) | surface |
| **oh-retro** | → oh-planner (next cycle) | → oh-handoff (if blocked) | surface |
| **oh-handoff** | → [end of session — intended terminal] | → [surface blocker] | surface |
| **oh-skill-craft** | → oh-skills-link (verify discovery) | → oh-expert (diagnose) | surface |
| **oh-skills-link** | → [report link status] | → oh-skill-craft (fix skill) | surface |
| **oh-skills-list** | → [done — read-only] | → [surface issue] | surface |

### Mode skills (no routing — mode switches)

| Skill | pass | fail | blocker |
|-------|------|------|---------|
| **oh-caveman** | → [mode active — return to prior skill] | → [fallback to normal mode] | surface |
| **oh-freeze** | → [scope lock active — return to prior skill] | → [surface issue] | surface |
| **oh-guard** | → [guard active — return to prior skill] | → [surface warning] | surface |
| **oh-learn** | → [done — read-only] | → [surface gaps] | surface |

## Routing graph (simplified)

```
oh-doctor ──fail──→ oh-investigate ──pass──→ oh-builder
                                       fail──→ oh-expert ──pass──→ oh-builder
                                                            fail──→ oh-expert
oh-planner ──pass──→ oh-grill ──pass──→ oh-planner (revise) ──→ oh-manifest
              fail──→ oh-planner (revise)

oh-manifest ──→ oh-planner → oh-builder → oh-gauntlet → oh-ship → oh-retro → oh-planner
                 ↑_____________________________|              |
                 |                                             ↓
                 └───────── oh-expert ←───────────────── fail

oh-ship ──pass──→ oh-retro ──→ oh-planner (loops forever)
           fail──→ oh-expert ──→ oh-builder ──→ oh-gauntlet

oh-facade ─── Concept → Design System → Build → Audit → Iterate (loop until pass)
                pass──→ oh-review or back to oh-manifest
                audit fail──→ Iterate (fix priority order)
```

## oh-facade Pipeline Detail

```
oh-facade:
  Phase 1 Concept    → direction brief
  Phase 2 Design Sys → DESIGN.md (color, typography, components, layout, motion, anti-patterns)
  Phase 3 Build      → production code (components + pages + all states)
  Phase 4 Audit      → 9-layer checklist (Priority 1-4)
  Phase 5 Iterate    → fix → re-audit → loop until pass
```

## Rules

1. Every skill routes somewhere — no leaf nodes (except handoff which is intentional terminal)
2. Route by outcome, not by convention — different results go different places
3. Default fallback if no match: **surface to user**
4. Mode skills (caveman, freeze, guard) return to the skill that invoked them after toggling state
5. The graph must have no dead ends — the only true terminal is `oh-handoff` (session end)

## OptiRoute Protocol

OptiRoute is a smart auto-routing guard layer. It prevents infinite loops, stops on ambiguity, and auto-generates handoff reports when a task goes nowhere.

### Loop Guard

Tracks routing depth per chain. Two thresholds:

| Threshold | Trigger | Action |
|-----------|---------|--------|
| **3x repeat** | Same skill visited 3+ times in one routing chain | STOP, invoke auto-handoff |
| **5-hop ceiling** | 5+ routing hops without measurable progress toward the original goal | STOP, invoke auto-handoff |

*Progress* is defined as: the routing target changed since the last hop, or a new artifact was produced (plan file updated, code written, test result).

### Question Gate

Before each routing hop, evaluate:

- Is the next skill's input fully satisfied? (plan file exists for builder, code exists for gauntlet, etc.)
- Is there any ambiguity that requires user clarification?

If either is no: **do not route. Ask the user a specific question.** Surface what you have, what's missing, and what you need.

### Auto-Handoff

When Loop Guard triggers:

1. **Stop routing immediately.** Do not attempt another hop.
2. **Write to plan file:** Append an OptiRoute report with:
   - Routing chain: the sequence of skills visited
   - Trigger: which threshold fired (3x repeat / 5-hop ceiling)
   - Current state: what artifacts exist, what's pending
   - Blocker: what prevented progress
3. **Surface to user** with: `OPTIROUTE STOP: <reason> | Chain: <skills> | See plan file for full report`
4. Exit the loop. Await user direction.
