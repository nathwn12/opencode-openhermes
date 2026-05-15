---
name: oh-facade
description: "Full UI pipeline: from concept to production frontend. Design system generation, premium component architecture, production-grade implementation, structured audit. Use when building any user-facing interface, component system, or visual application."
tier: 4
benefits-from: [oh-planner, oh-gauntlet, oh-review]
triggers:
  - "build a frontend for"
  - "create a design system"
  - "build a landing page"
  - "build a dashboard"
  - "build a web app"
  - "visual design for"
  - "make this look good"
  - "redesign this page"
  - "redesign this app"
  - "theme the application"
  - "layout this page"
  - "responsive layout"
  - "user interface design"
  - "improve the UX"
  - "aesthetic design"
  - "style the component"
  - "polish the UI"
  - "frontend component"
  - "interface design for"
  - "build a component for"
---

# oh-facade

The complete UI pipeline: from concept to production frontend. A closed-loop system that plans, designs, builds, verifies, and iterates on user-facing interfaces.

Architecture of the visible. Engineering, not decoration.

## When to Use

- Building any user-facing interface from scratch
- Adding a design system to an existing project
- Redesigning or upgrading existing UIs
- The task involves anything visual: pages, components, dashboards, themes, layouts
- `oh-manifest` delegates to `oh-facade` when UI work is detected in a full build

## Pipeline

The 5-phase closed loop:

```
Concept → Design System → Build → Audit → Iterate
                                      ↓
                                 (loop until pass)
```

Output at each phase: brief → DESIGN.md → code → report → final code.

---

## Phase 1: Concept

Input: vague idea, brief, or "make this look good"
Output: structured design brief with direction

### 1a. Understand the Context

- What is the product/feature? Who uses it?
- What problem does this interface solve?
- Are there technical constraints? (framework, viewport targets, accessibility requirements)
- Is this a new build or an existing project to redesign?

### 1b. Set the Direction

Choose an archetype. **Commit to it. Do not hedge.**

| Archetype | Best for | Substrate | Density |
|---|---|---|---|
| Minimal Editorial | Content sites, portfolios, docs | Light (warm off-white) | Low (1-3) |
| Premium SaaS | Web apps, dashboards, B2B tools | Light or Dark (zinc-based) | Medium (4-7) |
| Industrial/Data | Analytics, monitoring, internal tools | Dark (charcoal) | High (7-10) |
| Creative/Expressive | Marketing, agency sites, showcases | Dark or Light | Variable |

### 1c. Set Metric Dials

Three measurable controls that drive all downstream decisions. Default baseline, adapt based on context.

| Dial | Range | 1-3 | 4-7 | 8-10 |
|---|---|---|---|---|
| VARIANCE | 1-10 | Symmetric, predictable | Offset, asymmetric | Chaotic, artsy |
| MOTION | 1-10 | Static, CSS only | Fluid CSS + spring | Cinematic choreography |
| DENSITY | 1-10 | Gallery, airy | Standard app | Cockpit, packed |

**Default baseline:** VARIANCE=6, MOTION=5, DENSITY=4

### 1d. Output Design Brief

Single paragraph capturing: archetype, substrate (light/dark), metric dials, and key differentiator.

If the brief is clearly wrong or self-contradictory → surface to user.
Otherwise → Phase 2. Do not ask for approval.

---

## Phase 2: Design System

Input: design brief with direction + dials
Output: `DESIGN.md` — encoded design system as single source of truth

Generate a complete `DESIGN.md` file. This is the blueprint consumed by Phase 3. Every value must be specific — no vagueness, no "use a nice font."

### 2a. Color Palette

- **Neutral base**: Zinc or Slate family. Pick one (warm or cool). Never mix.
- **Accent**: Exactly one. Saturation < 80%. No purple/blue "AI aesthetic."
- **Surface**: Background, card, border, elevated. Specific hex codes.
- **Text**: Primary, secondary, muted, inverse. Specific hex codes.
- **Semantic**: Success, warning, error, info. Specific hex codes.
- **Dark substrate**: Never pure `#000000`. Use `#0a0a0a` or `#121212`.

### 2b. Typography Architecture

- **Display/Headline**: Premium sans-serif (Geist, Satoshi, Cabinet Grotesk, Outfit, Switzer). Tight tracking (`-0.03em` to `-0.05em`). Fluid scale via `clamp()`.
- **Body**: Relaxed leading (`1.6-1.8`). Max 65 characters per line. Off-black, not `#000`.
- **Monospace**: JetBrains Mono, Geist Mono, or SF Mono. Required for all data/number contexts when DENSITY > 5.
- **Serif**: Only for editorial/creative contexts and only distinctive modern serifs (Fraunces, Instrument Serif, Editorial New). **Never in dashboards or software UIs.**
- **BANNED**: Inter, Roboto, Arial, Open Sans, Helvetica, Georgia, Times New Roman.

### 2c. Component System

Define every component with structure, states, and interaction behavior:

**Buttons:**
- Primary: solid background, off-black or accent. Hover: lift or darken. Active: `scale(0.98)`. Focus ring.
- Secondary: outline or ghost. Same interaction physics.
- Icon button: square, matching radius system.
- Button-in-Button pattern (from high-end-visual-design): nested icon in its own pill inside the button.

**Cards:**
- Double-Bezel architecture: outer shell (subtle background, hairline border, large radius) + inner core (content background, inset highlight, smaller radius).
- OR border-only: `border-t` or `divide-y` for high-density contexts.
- Cards used ONLY when elevation communicates hierarchy. Not as default container.

**Forms/Inputs:**
- Label above input. Helper text optional. Error text below.
- Focus state: ring or border color shift.
- Touch targets: minimum 44px.

**Loading states:**
- Skeleton loaders matching exact layout dimensions. Never circular spinners.

**Empty states:**
- Composed illustration or icon, short message, single action button.

**Navigation:**
- Based on density dial: glass floating pill (low), sidebar (medium/high), or minimal top bar.
- Active state on current section.
- Mobile: clean collapse, not hamburger-only.

### 2d. Layout Principles

- **Grid**: CSS Grid. Never `calc()` or flexbox percentage math for multi-column layouts.
- **Container**: 1200-1440px max-width with auto margins. Wider for editorial/creative archetypes.
- **Section spacing**: Based on DENSITY dial. Low = `py-32 md:py-48`. Medium = `py-24`. High = `py-16`.
- **Responsive**: All multi-column layouts collapse to single column below 768px. No exceptions. Verify with `md:` breakpoints.
- **Full-height**: Always `min-h-[100dvh]`. Never `h-screen` (iOS Safari viewport bug).
- **BANNED**: centered hero when VARIANCE > 4, 3-equal-card feature rows, edge-to-edge content on wide screens.

### 2e. Motion Philosophy

- **Spring physics**: Default `cubic-bezier(0.32, 0.72, 0, 1)` or Framer Motion `spring(stiffness: 100, damping: 20)`. Never linear easing.
- **Scroll entry**: Elements fade up gently (`translateY(12-24px)` + `opacity: 0` → resolved over 600-800ms). Use IntersectionObserver or CSS scroll-driven animations. Never `window.addEventListener('scroll')`.
- **Staggered reveals**: Lists and grids cascade via `animation-delay` or Framer Motion `staggerChildren`.
- **Hover physics**: Scale, translate, shadow shift, or color transition on interactive elements. Duration 200-300ms.
- **Active feedback**: Every clickable element must provide tactile response — `scale(0.98)` or `translateY(1px)`.
- **Performance**: Animate exclusively via `transform` and `opacity`. Never `top`, `left`, `width`, `height`. Use `will-change: transform` sparingly.
- **Backdrop-blur**: Only on fixed/sticky elements (navbars, overlays). Never on scrolling containers.

### 2f. Anti-Patterns Registry

Explicit rules encoded into DESIGN.md. These are hard failures.

- No emojis in code, content, alt text, or markup
- No `Lorem Ipsum` — write real draft copy
- No "Elevate", "Seamless", "Next-Gen", "Unleash", "Game-changer" copy
- No generic names (John Doe, Acme Corp) — use realistic, specific content
- No rocket ship for "launch" or shield for "security" icons
- No purple/blue neon gradients
- No dark section in a white page (or vice versa) without committed dark mode
- No animated `top`, `left`, `width`, `height`
- No `window.addEventListener('scroll')`
- No `h-screen` for full-height sections

---

## Phase 3: Build

Input: DESIGN.md
Output: production code implementing the full system

### 3a. Set Up Foundations

1. CSS custom properties for colors, spacing, typography scale, shadows, border-radii
2. Tailwind config extensions (if using Tailwind) — map design tokens to utility classes
3. Theme provider or global stylesheet
4. Component directory structure

### 3b. Build Component Library

Implement every component defined in Phase 2 with ALL states:
- Default, hover, active, focus-visible, disabled
- Loading (skeleton matching layout)
- Empty (composed illustration + message + action)
- Error (inline messaging)

Apply performance guardrails to every component:
- Animations use `transform` and `opacity` only
- No layout-triggering properties in transitions
- `backdrop-blur` only on fixed/sticky elements
- Z-index follows systemic scale (no arbitrary `z-50` or `z-[9999]`)

### 3c. Build Pages/Screens

1. Implement the full interface using the component system
2. Responsive: verify single-column collapse below 768px
3. All viewports filled: loading → populated → empty → error states
4. Navigation wired with active states and mobile collapse

### 3d. Technical Requirements

- Check `package.json` before importing any dependency. Never assume a library exists.
- Use framework-appropriate patterns: Server Components in Next.js, client isolation for interactive islands
- Semantic HTML: `<nav>`, `<main>`, `<section>`, `<article>`, `<aside>`, `<header>`, `<footer>`
- Accessibility: visible focus rings, skip-to-content link, alt text, aria labels on interactive elements
- Meta tags: `<title>`, `description`, `og:image`, viewport

---

## Phase 4: Audit

Input: built code + DESIGN.md
Output: audit report with pass/fail per check + ranked fix list

Run the full structured audit. Checks are grouped and priority-ranked.

### Priority 1 — High Impact, Low Risk (do first)

- **Typography**: font choice matches DESIGN.md? scale correct? tracking applied? no orphan lines? body max-width limited?
- **Color**: single accent? saturation < 80%? no AI purple? warm/cool consistent? dark not pure black?
- **Layout**: grid not flexbox math? max-width container? `min-h-[100dvh]` everywhere? responsive at 768px?

### Priority 2 — Makes it Feel Alive

- **Interactivity**: hover states on all clickables? active feedback (`scale(0.98)` or translate)? focus rings? transitions smooth (200-300ms)?
- **States**: every component has loading, empty, error states? skeleton loaders (not spinners)?
- **Motion**: scroll entry animations present? staggered reveals? spring physics (not linear)?

### Priority 3 — Content Polish

- **Content**: no lorem ipsum? no cliche copy? realistic names and data? no generic placeholders?
- **Emojis**: zero emojis in code or content?
- **Anti-patterns**: no "Elevate", no rocket icons, no purple gradients?

### Priority 4 — Production Hardening

- **Components**: Double-Bezel or appropriate card architecture? button-in-button pattern where applicable? navigation active states?
- **Iconography**: consistent stroke width? no default library? no emoji substitutions?
- **Code quality**: semantic HTML? no div soup? no inline styles? no orphaned imports?
- **Strategic**: 404 page? skip-to-content? meta tags? cookie consent consideration?

### Phase 5: Iterate

1. Apply fixes in Priority order — do not skip ahead
2. Re-run audit after each priority level
3. Continue until all Priority 1-3 checks pass
4. Priority 4 is target-state — surface remaining items as recommendations
5. If blocked on a specific check → narrow scope, try alternative approach, or surface

## Design Principles

These govern all decisions across all phases:

1. **Intentionality over intensity** — Bold maximalism and refined minimalism both work. The key is commitment to a direction, not how loud it is.
2. **Engineering over decoration** — A button is not "styled" — it has a physical structure, interaction physics, and accessible states.
3. **Consistency over variety** — One palette, one font system, one component architecture. Consistency beats every single creative choice.
4. **Performance is a feature** — A beautiful UI that lags is not a beautiful UI. Hardware acceleration, transform-only animation, guarded backdrop-blur.
5. **Ship every state** — Default-only is not production. Loading, empty, error, hover, active, focus, disabled. Every state designed and implemented.

## Routing

| Outcome | Route |
|---|---|
| all phases pass | -> oh-review (design review) or back to oh-manifest |
| audit fails Priority 1-2 | -> Phase 5 (iterate — fix and re-audit) |
| audit fails Priority 3-4 only | -> Phase 5 (recommendations), route to oh-review |
| blocker | -> surface to user |
