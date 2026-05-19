# Design Blacklist — Shared Constants

> Single source of truth for AI slop detection, banned fonts, hard bans, confidence tiers,
> and happy talk rules. Consumed by oh-facade, oh-review, oh-health, and oh-refactor.
> Edit here, never inline in individual skills.

---

## AI Slop Blacklist (11 items)

The test: *would a human designer at a respected studio ever ship this?*

1. **Purple/violet/indigo gradient backgrounds** or blue-to-purple color schemes
2. **3-column feature grid** — icon-in-colored-circle + bold title + 2-line description, repeated 3× symmetrically. THE most recognizable AI layout.
3. **Icons in colored circles** as section decoration (SaaS starter template look)
4. **Centered everything** — `text-align: center` on all headings, descriptions, cards
5. **Uniform bubbly border-radius** — same large radius (≥16px) on every element
6. **Decorative blobs, floating circles, wavy SVG dividers** — if a section feels empty, it needs better content, not decoration
7. **Emoji as design elements** — rockets in headings, emoji as bullet points
8. **Colored left-border on cards** — `border-left: 3px solid <accent>`
9. **Generic hero copy** — "Welcome to [X]", "Unlock the power of...", "Your all-in-one solution for..."
10. **Cookie-cutter section rhythm** — hero → 3 features → testimonials → pricing → CTA, all same height
11. **system-ui / `-apple-system` as primary typeface** — the "I gave up on typography" signal. Pick a real typeface.

Source: gstack anti-slop methodology + OpenAI "Designing Delightful Frontends" (Mar 2026).

---

## Font Blacklist

### Never recommend as primary (AI convergence traps)
| Font | Why |
|------|-----|
| Inter | Every AI tool defaults to it |
| Roboto | Android default, generic |
| Arial | System fallback, no character |
| Helvetica | Same as Arial with pretension |
| Open Sans | Overused web safe |
| Lato | Dated 2010s web default |
| Montserrat | Overused display sans |
| Poppins | Overused geometric sans |
| Space Grotesk | The new "safe alternative to Inter" — every AI design tool converges on it |
| system-ui / -apple-system | The "I gave up on typography" signal |

### Never recommend ever (decorative/abuse)
Papyrus, Comic Sans, Lobster, Impact, Jokerman, Bleeding Cowboys, Permanent Marker, Bradley Hand, Brush Script, Hobo, Trajan

---

## Hard Bans (non-negotiable — apply to ALL design output)

- No emojis in code/content/alt/markup
- No Lorem Ipsum — write real draft copy
- No "Elevate", "Seamless", "Next-Gen", "Unleash", "Game-changer", "Revolutionize"
- No generic names (John Doe, Acme Corp)
- No rocket ship / shield cliche icons
- No purple/blue neon gradients
- No dark section in light page without committed dark mode
- No animated `top/left/width/height`
- No `window.addEventListener('scroll')` — use IntersectionObserver or CSS scroll-driven
- No `h-screen` — use `min-h-[100dvh]` (iOS Safari fix)
- No pill shapes on large containers, cards, or primary buttons
- No generic icon libraries (Lucide, Feather, Heroicons) — pick a specific, less-used set
- No 3-equal-card feature rows — replace with 2-column zig-zag, asymmetric grid, or masonry
- No `#000000` backgrounds — use off-black `#0a0a0a` or `#121212`
- No even 45-degree linear gradients — break with radial, noise overlay, or mesh
- No mixing warm and cool grays — stick to one gray family throughout
- No random dark section in light page (or vice versa) — commit to one substrate
- No orphaned words — use `text-wrap: balance` or `text-wrap: pretty`
- No `outline: none` without a replacement focus indicator
- No `!important` in new CSS — fix specificity instead
- No `font-size` < 16px on body text
- No placeholder-as-label — labels must be visible when field has content
- No floating headings — heading must be visually closer to its section than the preceding one

---

## Confidence Tiers for Detection

Used by oh-review design checklist to classify finding reliability:

| Tier | Meaning | Auto-fix? |
|------|---------|-----------|
| **HIGH** | Reliably detectable via grep/pattern match. Definitive. | YES — mechanical fixes only (outline:none, !important, font-size <16px) |
| **MEDIUM** | Detectable via pattern aggregation or heuristic. Some noise expected. | NO — present as finding, ask before fixing |
| **LOW** | Requires understanding visual intent. | NO — present as "Possible issue — verify visually or run /design-review" |

---

## Happy Talk Detection Rules

1. **Scan** all visible text for introductory paragraphs starting with "Welcome to..." or telling users how great the site is
2. **Instructions check** — if users need to read instructions >1 sentence long, the design has failed. Flag both the instructions AND the interaction they're compensating for
3. **Word count** — count total visible words. Classify each block as "useful content" vs "happy talk" (welcome paragraphs, self-congratulatory text, instructions nobody reads)
4. **Report format**: "This page has X words. Y (Z%) are happy talk."

---

## Code Slop: What to Fix vs What to Skip

Used by oh-health and oh-refactor when evaluating AI-generated code quality.

### What to fix (genuine quality improvements)
- **Empty catches around file ops** — use `safeUnlink()` (ignores ENOENT, rethrows EPERM/EIO). A swallowed EPERM in cleanup means silent data loss.
- **Empty catches around process kills** — use `safeKill()` (ignores ESRCH, rethrows EPERM).
- **Redundant `return await`** — remove when no enclosing try block. Saves a microtask, signals intent.
- **Typed exception catches** — `catch (err) { if (!(err instanceof TypeError)) throw err }` is genuinely better than `catch {}` when the try block does URL parsing or DOM work.
- **Dead code, stale imports, commented-out code** — remove.

### What NOT to fix (correct patterns that tools may flag)
- **String-matching on error messages** — brittle. If a fire-and-forget operation can fail for ANY reason and you don't care, `catch {}` is the correct pattern.
- **Comments to exempt pass-through wrappers** — noise, not documentation.
- **Catch-and-log in extension/browser code** — extensions crash entirely on uncaught errors. If the catch logs and continues, that IS the right pattern.
- **Best-effort cleanup paths** — shutdown, emergency cleanup should swallow all errors. A cleanup path that throws means the rest of cleanup doesn't run.
