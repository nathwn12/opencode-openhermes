---
name: oh-facade
description: "Full UI pipeline: from concept to production frontend. Design system generation, premium component architecture, production-grade implementation, structured audit. Use when building any user-facing interface, component system, or visual application."
tier: 4
format: chunked
benefits-from: [oh-planner, oh-gauntlet, oh-review]
triggers: ["build a frontend for", "create a design system", "build a landing page", "build a dashboard", "build a web app", "visual design for", "make this look good", "redesign this page", "redesign this app", "theme the application", "layout this page", "responsive layout", "user interface design", "improve the UX", "aesthetic design", "style the component", "polish the UI", "frontend component", "interface design for", "build a component for"]
route:
  pass: [oh-review, oh-manifest]
  fail: oh-facade
  blocker: surface
sections:
  phase-0-redesign: "Framework/styling scan, audit-driven diagnosis using Phase 4 checklist, targeted in-place upgrades without rewrite"
  phase-1-concept: "Context questions (product/user/problem/constraints), 4 archetypes (Warm Minimalist, Premium SaaS, Industrial Brutalist, Creative/Expressive), 3 metric dials (VARIANCE/MOTION/DENSITY 1-10), design brief output"
  phase-2-design-system: "Color system (neutral/accent/surface/text/semantic/dark), typography stack (display/body/mono/serif + banned fonts), component specs (buttons/cards/forms/loading/empty/nav), layout (grid/container/spacing/responsive), motion (spring/scroll/hover/active/performance), GSAP ScrollTrigger patterns (pinning/scale/horizontal/stagger/text-split/python-randomization/bento)"
  phase-3-build: "CSS custom properties + Tailwind token mapping, component library (all states: default/hover/active/focus/disabled/loading/empty/error), page assembly + responsive collapse + viewport states, framework/a11y/meta requirements"
  phase-4-audit: "Priority-ranked audit P1-P5 (typography/color/layout, interactivity/states/motion, content quality, hardening/a11y, existing-project redesign scan). Iteration loop: fix in priority order, re-audit per level, surface blocker"
---

# oh-facade

Full UI pipeline: Concept → Design System → Build → Audit → Iterate. Closed-loop. Engineering, not decoration.

---

## Sections

| Phase | Description |
|-------|-------------|
| [Phase 0: Redesign Entry](sections/phase-0-redesign.md) | Existing project scan — detect framework/styling, run Phase 4 diagnosis, apply targeted upgrades without rewrite |
| [Phase 1: Concept](sections/phase-1-concept.md) | Context questions (product/user/problem/constraints), 4 visual archetypes (Warm Minimalist, Premium SaaS, Industrial Brutalist, Creative/Expressive), 3 metric dials (VARIANCE/MOTION/DENSITY), design brief output |
| [Phase 2: Design System](sections/phase-2-design-system.md) | Color tokens, typography stack, component specs, layout grid, motion/spring rules, GSAP ScrollTrigger patterns (pinning/scale/horizontal/stagger/text-split/python-randomization/bento) |
| [Phase 3: Build](sections/phase-3-build.md) | CSS foundations + token mapping, component library (all states: default/hover/active/focus/disabled/loading/empty/error), page assembly + responsive + viewport states, framework/a11y/meta |
| [Phase 4: Audit + Iterate](sections/phase-4-audit.md) | Priority-ranked audit P1-P5 (typography/color/layout, interactivity/states/motion, content quality, hardening/a11y, existing-project redesign). Fix in priority order, re-audit per level, surface blocker |

---

## Hard Bans

- No emojis in code/content/alt/markup
- No Lorem Ipsum — write real draft copy
- No "Elevate", "Seamless", "Next-Gen", "Unleash", "Game-changer"
- No generic names (John Doe, Acme Corp)
- No rocket ship / shield cliche icons
- No purple/blue neon gradients
- No dark section in white page without committed dark mode
- No animated `top/left/width/height`
- No `window.addEventListener('scroll')`
- No `h-screen`
- No pill shapes on large containers, cards, or primary buttons
- No generic icon libraries (Lucide, Feather, Heroicons)
- No 3-equal-card feature rows — replace with 2-column zig-zag, asymmetric grid, or masonry
- No `#000000` backgrounds — use off-black `#0a0a0a` or `#121212`
- No even 45-degree linear gradients — break with radial, noise overlay, or mesh
- No mixing warm and cool grays — stick to one gray family throughout
- No random dark section in light page (or vice versa) — commit to one substrate
- No orphaned words — use `text-wrap: balance` or `text-wrap: pretty`

---

## Design Principles

1. **Intentionality** — Commit to direction. Maximalism and minimalism both work if committed.
2. **Engineering** — Buttons have structure, physics, a11y. Not just "style."
3. **Consistency** — One palette, one font system, one architecture.
4. **Performance** — Beautiful + laggy = not beautiful. Transform-only, guarded backdrop-blur.
5. **Ship every state** — Default-only is not production.
6. **Redesign first** — For existing projects, diagnose before prescribing. Improve in-place. A targeted upgrade beats a rewrite.

---

## Routing

| Outcome | Route |
|---------|-------|
| All phases pass | → oh-review or oh-manifest |
| Audit fails P1-P2 | → Phase 5 (iterate) |
| Audit fails P3-P4 | → Phase 5 (recs), route to oh-review |
| Blocker | → surface |
