## Phase 2: Design System

Input: brief + dials. Output: `DESIGN.md` — single source of truth. Every value specific, no vagueness.

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
