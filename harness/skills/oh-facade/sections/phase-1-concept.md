## Phase 1: Concept

Input: vague idea / brief. Output: structured design brief.

### 1a. Context
What product/feature? Who uses it? What problem does it solve? Technical constraints (framework, viewport, a11y)? New build or redesign?

### 1b. Direction Archetype

Commit to one. Do not hedge.

| Archetype | Best for | Substrate | Density | Key Traits |
|---|---|---|---|---|
| Warm Minimalist | Content sites, portfolios | Light (warm off-white #F7F6F3) | Low (1-3) | Ultra-flat bento grids, muted pastels, editorial serif headers, no shadows |
| Premium SaaS | Web apps, dashboards | Light/Dark (zinc) | Medium (4-7) | Standard app patterns, glass nav, structured dashboards |
| Industrial Brutalist | Data dashboards, monitoring, tools | Dark (charcoal #1a1a1a) | High (7-10) | Swiss typographic print, CRT terminals, rigid grids, extreme contrast |
| Creative/Expressive | Marketing, showcases | Dark or Light | Variable | GSAP ScrollTriggers, pinning, stacking, scrubbing, Python-randomized layout |

### 1c. Metric Dials

| Dial | 1-3 | 4-7 | 8-10 |
|------|-----|-----|------|
| VARIANCE | Symmetric | Offset, asymmetric | Chaotic |
| MOTION | CSS only | CSS + spring | Cinematic |
| DENSITY | Airy | Standard app | Cockpit |

**Default:** VARIANCE=6, MOTION=5, DENSITY=4

### 1d. Output Brief
Single paragraph: archetype, substrate, dials, key differentiator. Self-contradictory → surface. Otherwise → Phase 2.
