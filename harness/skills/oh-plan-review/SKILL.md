---
name: oh-plan-review
description: "Multi-lens plan review: 4 perspectives in one skill. Choose Engineering (architecture/scope), Design (UX/interaction), DX (API/CLI ergonomics), or Strategy (product/CEO). Interactive — walks through findings one section at a time."
tier: 3
benefits-from: [oh-planner, oh-expert]
format: chunked
sections:
  01-lens-selection: "Keyword-to-lens routing table mapping terms (architecture, UI, CLI, product) to four review lenses (Engineering, Design, DX, Strategy)"
  02-engineering-lens: "Engineering scope challenge (existing code reuse, minimum changes, smell detection), Architecture Review procedure (8 issues max per section, anti-skip), cognitive patterns (Larson state diagnosis, blast radius, boring by default, reversibility, essential vs accidental complexity)"
  03-design-dx-lenses: "Design lens criteria (empty states, visual hierarchy, edge cases, AI slop detection, responsive, a11y with specificity rule) and DX lens evaluation (time to Hello World, error quality, progressive disclosure, Pit of Success, three modes: Expansion/Polish/Triage)"
  04-strategy-rules-routing: "Strategy lens scope modes (Expansion/Selective/Hold/Reduction), patterns (Bezos one-way/two-way doors, Munger inversion, Jobs focus, proxy skepticism, temporal depth), prime directives (failure visibility, named errors, shadow paths, observability), interactive rules, output format, and pass/fail/blocker routing"
triggers:
  - "review this plan"
  - "review the plan file"
  - "architecture review of"
  - "design review the plan"
  - "ux review this plan"
  - "dx review the plan"
  - "strategy review"
  - "engineering review"
  - "ceo review"
  - "review plan from"
route:
  pass:
    - oh-grill
    - oh-manifest
  fail: oh-planner
  blocker: surface
---

# oh-plan-review

Four lenses in one skill. Interactive — walk findings one section at a time. Read-only — output is a better plan, not a document about the plan.

**This skill is chunked.** Read this index, pick the section you need, and `read()` only that section file.

## Section Index

| # | Section | Covers |
|---|---------|--------|
| 1 | [Lens Selection](./sections/01-lens-selection.md) | Keyword-to-lens routing table mapping terms (architecture, UI, CLI, product) to four review lenses |
| 2 | [Engineering Lens](./sections/02-engineering-lens.md) | Scope challenge, Architecture Review procedure (8 issues max, anti-skip), cognitive patterns |
| 3 | [Design & DX Lenses](./sections/03-design-dx-lenses.md) | Design criteria (empty states, hierarchy, AI slop, a11y) and DX evaluation (Hello World time, error quality, modes) |
| 4 | [Strategy, Rules & Routing](./sections/04-strategy-rules-routing.md) | Strategy scope modes, patterns (Bezos/Munger/Jobs), prime directives, interactive rules, output, routing |

## Routing

| Outcome | Route |
|---------|-------|
| pass | → oh-grill (if concerns remain) or oh-manifest (execute) |
| fail | → oh-planner (revise) |
| blocker | → surface |
