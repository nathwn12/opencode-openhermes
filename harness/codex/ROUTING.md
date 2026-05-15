# OpenHermes Routing Graph

## Overview

Routing is **dynamic** — each skill carries its own routing metadata in its `SKILL.md` frontmatter (`route.pass`, `route.fail`, `route.blocker`). The autopilot reads the current skill's frontmatter at runtime to determine the next hop. This allows user skills to participate in routing automatically.

This document serves as a human-readable reference for the overall flow. For routing decisions, always read the skill's frontmatter — it is the authoritative source.

## Route value types

| Value | Meaning |
|-------|---------|
| `oh-<name>` | Route to skill |
| `[oh-a, oh-b]` | Route to one of — choose by context |
| `surface` | Report findings to user, end chain |
| `done` | Task complete — terminal |
| `mode` | Mode switch — return to caller after toggle |

## Routing graph (simplified)

```
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
