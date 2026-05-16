# oh-facade — Deep Reference

## Phase 0: Redesign Entry (existing projects)

Skip this phase for new builds. For existing projects, run this scan first:

### 0a. Scan
Read the codebase. Identify framework, styling method (Tailwind, vanilla CSS, styled-components, etc.), and current design patterns.

### 0b. Diagnose
Run the audit from Phase 4. List every generic pattern, weak point, and missing state found.

### 0c. Fix in-place
Apply targeted upgrades working with the existing stack. Do not rewrite from scratch. Improve what's there.

## Phase 1: Concept

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

## Phase 2: Design System

### 2a. Color
- **Neutral**: Zinc or Slate. One. Never mix.
- **Accent**: Exactly one. Saturation < 80%. No AI purple/blue.
- **Surface**: Background, card, border, elevated. Specific hex.
- **Text**: Primary, secondary, muted, inverse. Specific hex.
- **Semantic**: Success, warning, error, info. Specific hex.
- **Dark**: Never `#000`. Use `#0a0a0a` or `#121212`.

### 2b. Typography
- **Display**: Premium sans (Geist, Satoshi, Cabinet Grotesk, Outfit, Switzer). Tight tracking `-0.03em` to `-0.05em`. Fluid `clamp()`.
- **Body**: Leading 1.6-1.8. Max 65ch. Off-black, not `#000`.
- **Mono**: JetBrains Mono, Geist Mono, SF Mono. Required when DENSITY > 5.
- **Serif**: Editorial/creative only (Fraunces, Instrument Serif). Never in dashboards.
- **BANNED**: Inter, Roboto, Arial, Open Sans, Helvetica, Georgia, Times New Roman.

### 2c. Components
**Buttons:** Primary (solid, off-black/accent), Secondary (outline/ghost), Icon (square). Hover lift/darken. Active `scale(0.98)`. Focus ring.

**Cards:** Double-Bezel (outer shell + inner core) or border-only (`border-t`/`divide-y` for high density). Cards only when elevation communicates hierarchy.

**Forms:** Label above, error below. Focus ring. Touch targets ≥ 44px.

**Loading:** Skeletons matching layout dimensions. No spinners.

**Empty:** Composed illustration + message + action button.

**Nav:** Glass floating pill (low density), sidebar (medium/high), or top bar. Active state. Mobile collapse (not hamburger-only).

### 2d. Layout
- **Grid**: CSS Grid. No flexbox percentage math for multi-column.
- **Container**: 1200-1440px max-width with auto margins.
- **Section spacing**: `py-32 md:py-48` (low), `py-24` (medium), `py-16` (high).
- **Responsive**: All multi-column → single below 768px. No exceptions.
- **Full-height**: `min-h-[100dvh]`. Never `h-screen` (iOS Safari bug).
- **BANNED**: Centered hero when VARIANCE > 4, 3-equal-card rows, edge-to-edge on wide screens.

### 2e. Motion
- **Spring**: `cubic-bezier(0.32, 0.72, 0, 1)` or Framer `spring(stiffness:100, damping:20)`. No linear.
- **Scroll entry**: fade up `translateY(12-24px)` + opacity 0→1, 600-800ms. IntersectionObserver or CSS scroll-driven. No `window.addEventListener('scroll')`.
- **Stagger**: Lists cascade via `animation-delay` or `staggerChildren`.
- **Hover**: scale, translate, shadow, or color. 200-300ms.
- **Active**: Every clickable gets `scale(0.98)` or `translateY(1px)`.
- **Performance**: Only `transform` and `opacity`. No `top/left/width/height`. `will-change: transform` sparingly.
- **Backdrop-blur**: Fixed/sticky elements only. Never scrolling containers.

### 2e(ii). GSAP Motion (Creative/Expressive archetype only)

When MOTION dial >= 7 or archetype is Creative/Expressive, use GSAP ScrollTrigger:
- **Scroll Pinning** — pin a section title on the left while gallery scrolls on the right: `pin: true, anticipatePin: 1`
- **Image Scale & Fade** — images start `scale(0.8)`, grow to `scale(1.0)` on enter, darken/fade to `opacity(0.2)` on exit
- **Horizontal Scroll** — horizontal scroll section with pinned container, scrub trigger
- **Staggered Reveal** — `stagger: 0.15` on child elements via `ScrollTrigger.batch()`
- **Text Splitting** — split text into lines/chars, reveal each with stagger
- **Spring Physics** — `cubic-bezier(0.32, 0.72, 0, 1)` or Framer `spring(stiffness:100, damping:20)`
- **Python Randomization** — use deterministic seed (character count of prompt `%` math) to select hero architecture, typography stack, GSAP paradigm. Never default to same layout twice.
- **Gapless Bento Grids** — use `grid-flow-dense` / `grid-auto-flow: dense`. Verify mathematically that `col-span`/`row-span` values interlock with no empty cells.

## Phase 3: Build

### 3a. Foundations
CSS custom properties for colors, spacing, typography, shadows, radii. Tailwind config extensions mapping tokens to utilities. Theme provider. Component directory structure.

### 3b. Component Library
Implement ALL defined components with every state: default, hover, active, focus-visible, disabled, loading (skeleton), empty (illustration + action), error (inline). Performance: transform/opacity only, systemic z-index scale.

### 3c. Pages
Full interface from components. Responsive collapse at 768px. All viewport states (loading → populated → empty → error). Nav with active states and mobile collapse.

### 3d. Requirements
- Check `package.json` before importing — never assume a library exists
- Framework-appropriate patterns (Server Components, island architecture)
- Semantic HTML: `<nav>`, `<main>`, `<section>`, `<article>`, `<aside>`, `<header>`, `<footer>`
- A11y: focus rings, skip-to-content, alt text, aria labels
- Meta: `<title>`, description, `og:image`, viewport

## Phase 4: Audit

### Priority 1 (do first)
- **Typography**: font matches spec? scale correct? tracking? no orphans? max-width?
- **Color**: single accent? saturation < 80%? no AI purple? consistent? dark not pure black?
- **Layout**: grid not flexbox math? `min-h-[100dvh]`? responsive at 768px?

### Priority 2 (feel)
- **Interactivity**: hover on all clickables? active feedback? focus rings? 200-300ms transitions?
- **States**: every component has loading/empty/error? skeletons (not spinners)?
- **Motion**: scroll entries? staggered? spring physics?

### Priority 3 (content)
- No lorem ipsum, cliches (Elevate, etc), generic names, emojis, bad icons?

### Priority 4 (hardening)
- Double-Bezel or appropriate card? button-in-button? nav active states?
- Consistent icon stroke? semantic HTML? no inline styles?
- 404 page? skip-to-content? meta tags? cookie consent?

### Priority 5 (existing project redesign scan)
- **Typography audit**: browser default fonts or Inter everywhere? Only Regular/Bold weights? Missing letter-spacing? All-caps subheaders everywhere? Orphaned words?
- **Color audit**: pure `#000` background? Oversaturated accents? Mixing warm + cool grays? AI purple/blue gradient? Generic `box-shadow` (pure black tint)? No texture (pure flat)?
- **Layout audit**: 3-equal-card rows? `height: 100vh` instead of `min-h-[100dvh]`? Complex flexbox percentage math? Everything centered and symmetrical?
- **Surface audit**: flat sections with no visual depth? No background imagery? Sudden dark section in light page?
- **Icon audit**: generic thin-line icon library? Rocket ship / shield cliches?

### Phase 5: Iterate
1. Fix in Priority order. Re-audit after each level.
2. All P1-P3 pass → done. P4 surface as recommendations.
3. Blocked on a check → narrow scope or surface.

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

## Design Principles

1. **Intentionality** — Commit to direction. Maximalism and minimalism both work if committed.
2. **Engineering** — Buttons have structure, physics, a11y. Not just "style."
3. **Consistency** — One palette, one font system, one architecture.
4. **Performance** — Beautiful + laggy = not beautiful. Transform-only, guarded backdrop-blur.
5. **Ship every state** — Default-only is not production.
6. **Redesign first** — For existing projects, diagnose before prescribing. Improve in-place. A targeted upgrade beats a rewrite.
