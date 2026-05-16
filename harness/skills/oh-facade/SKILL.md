---
name: oh-facade
description: "Full UI pipeline: from concept to production frontend. Design system generation, premium component architecture, production-grade implementation, structured audit."
tier: 4
route:
  pass:
    - oh-review
    - oh-manifest
  fail: oh-facade
  blocker: surface
---

# oh-facade

Full UI pipeline: Concept → Design System → Build → Audit → Iterate.

## Steps

1. Scan existing codebase — detect framework, styling, current patterns. For redesigns, run phase 0 diagnosis first.
2. Establish direction — collect product/user/problem context, commit to one archetype (Warm Minimalist, Premium SaaS, Industrial Brutalist, Creative/Expressive), set metric dials (VARIANCE, MOTION, DENSITY).
3. Produce DESIGN.md — define color tokens (neutral/accent/surface/text/semantic/dark), typography stack (display/body/mono/serif), component specs, layout grid, and motion rules.
4. Build foundations — CSS custom properties, Tailwind config extensions, theme provider, component directory.
5. Implement component library — all components with every state: default, hover, active, focus-visible, disabled, loading, empty, error.
6. Assemble pages — full interfaces from components, responsive collapse at 768px, all viewport states (loading → populated → empty → error).
7. Run priority-ranked audit — P1 (typography/color/layout), P2 (interactivity/states/motion), P3 (content quality), P4 (hardening/a11y), P5 (existing-project redesign scan).
8. Iterate — fix highest-priority failures first, re-audit after each level, surface blocker if fix impossible.

## Routing

| Outcome | Route |
|---------|-------|
| pass | → oh-review or oh-manifest |
| fail | → oh-facade |
| blocker | → surface |
