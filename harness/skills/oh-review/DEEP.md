# oh-review — Deep Reference

## Mode A: Diff Review

### 1. Pin Fixed Point
User provides branch/commit/tag. Capture `git diff <fixed>...HEAD` + `git log <fixed>..HEAD --oneline`.

### 2. Find Spec Source (order)
1. Issue refs in commit messages (`#123`, `Closes #45`)
2. User-provided path
3. `docs/`, `specs/`, `.scratch/` files
4. Ask user

No spec found → spec sub-agent reports "no spec available."

### 3. Find Standards Sources
AGENTS.md, CLAUDE.md, CONTRIBUTING.md, CONTEXT.md, ADRs, eslint/biome/prettier config (note tool-enforced — don't re-check).

### 4. Spawn Sub-Agents (parallel)
- **Standards** — Read standards + diff. Per-file/hunk: violations citing standard + rule. Distinguish hard violations from judgment calls. Skip tool-enforced.
- **Spec** — Read spec + diff. Report: missing/partial requirements, scope creep, wrong implementations. Quote spec line.

### 5. Aggregate
Present under `## Standards` / `## Spec`. Do not merge. End with total + worst issue.

Concrete, low-risk, fixable findings should be converted into implementation work and dispatched to oh-builder immediately instead of stopping as report-only notes.

### Safety Check (inline before spawning)
- SQL injection, LLM trust boundary violations, conditional side effects (test vs prod), hardcoded secrets
- Block immediately if critical — do not spawn sub-agents.
- Also check for hardcoded CSS anti-patterns from `reference/design-blacklist.md` §Hard Bans — if diff contains `outline: none` without focus replacement or `!important` in new rules, auto-fix inline before spawning sub-agents.

### Design Checklist (conditional — frontend diffs only)

Run only if the diff touches frontend files (CSS, HTML, JSX, TSX, Vue, Svelte).
Detect scope via: `git diff <fixed>...HEAD --name-only | grep -iE '\.(css|html|jsx|tsx|vue|svelte|scss|less)$'`

If no frontend files changed, skip this section silently.

#### Categories (sourced from `reference/design-blacklist.md`)

**1. AI Slop Detection** (highest priority)
- **[MEDIUM]** Purple/violet/indigo gradient backgrounds or blue-to-purple schemes — grep for `linear-gradient` with `#6366f1`–`#8b5cf6` range
- **[LOW]** 3-column feature grid: icon-in-colored-circle + title + description ×3 — grep for grid/flex container with exactly 3 children matching this pattern
- **[LOW]** Icons in colored circles — grep for `border-radius: 50%` + background color used as icon container
- **[HIGH]** Centered everything — grep for `text-align: center` density. If >60% of text containers use center, flag it
- **[MEDIUM]** Uniform bubbly border-radius ≥16px on >80% of elements
- **[MEDIUM]** Generic hero copy: "Welcome to", "Unlock the power", "Your all-in-one solution", "Revolutionize"

**2. Typography**
- **[HIGH]** Body text `font-size` < 16px
- **[HIGH]** >3 distinct `font-family` values in diff
- **[HIGH]** Heading hierarchy skipping levels (h1 → h3 without h2)
- **[HIGH]** Blacklisted fonts (Inter, Roboto, Arial, Open Sans, Lato, Montserrat, Poppins, Space Grotesk, system-ui)

**3. Spacing & Layout**
- **[MEDIUM]** Arbitrary spacing not on 4px/8px scale (when DESIGN.md defines one)
- **[MEDIUM]** Fixed widths without responsive handling
- **[MEDIUM]** Missing `max-width` on text containers (lines >75ch)
- **[HIGH]** `!important` in new CSS

**4. Interaction States**
- **[MEDIUM]** Interactive elements missing hover/focus states
- **[HIGH]** `outline: none` or `outline: 0` without focus replacement
- **[LOW]** Touch targets < 44px

**5. DESIGN.md Violations** (conditional — only if DESIGN.md exists)
- **[MEDIUM]** Colors outside stated palette
- **[MEDIUM]** Fonts outside stated typography
- **[MEDIUM]** Spacing outside stated scale

#### Output Format

```
Design Review: N issues (X auto-fixable, Y need input, Z possible)

AUTO-FIXED:
- [file:line] Problem → fix applied

NEEDS INPUT:
- [file:line] Problem description
  Recommended fix: suggested fix

POSSIBLE (verify visually):
- [file:line] Possible issue — verify with /design-review
```

#### Auto-Fix vs Ask Rules

**AUTO-FIX** (mechanical, HIGH confidence, no design judgment):
- `outline: none` without replacement → add `outline: revert` or `&:focus-visible { outline: 2px solid currentColor; }`
- `!important` in new CSS → remove and fix specificity
- `font-size` < 16px on body text → bump to 16px

**ASK** (MEDIUM/LOW confidence, requires design judgment):
- All AI slop findings, typography structure, spacing choices, interaction state gaps, DESIGN.md violations — present as findings, do not auto-fix

**LOW confidence items** → prefix with "Possible: [description]. Verify visually or run /design-review." Never auto-fix.

#### Suppressions
Do NOT flag:
- Patterns explicitly documented in DESIGN.md as intentional
- Third-party/vendor files (node_modules, vendor)
- CSS resets or normalize stylesheets
- Test fixture files
- Generated/minified CSS

## Mode B: Architecture Deepening

Surface refactoring opportunities using the **deletion test**: deleting a shallow module concentrates complexity; a deep module's complexity vanishes.

### Vocabulary
- **Module** — interface + implementation
- **Depth** — leverage at interface (lots of behavior, small interface)
- **Seam** — where interface lives; place to alter behavior without in-place edit
- **Leverage** — what callers get from depth
- **Locality** — change concentrated in one place

### Process
1. **Explore** — Read CONTEXT.md, ADRs. Walk codebase for friction (bouncing between modules, shallow interfaces, deletion test candidates).
2. **Present candidates** — Numbered. Files, problem, solution, locality/leverage benefits. Flag ADR conflicts.
3. **Grilling loop** — Walk design tree. Update CONTEXT.md for new terms. Offer ADRs for rejected candidates.
4. **Output** — Ranked refactoring candidates with collision warnings.

## Mode C: Receiving Review Feedback

**Pattern:** READ → UNDERSTAND → VERIFY → EVALUATE → RESPOND → IMPLEMENT

### Banned Responses
Never: "You're absolutely right!", "Great point!", "Excellent feedback!", any gratitude. Instead: restate technical requirement, ask clarifying questions, or just implement.

### Source-Specific Handling
- **Partner (trusted):** Still verify. No performative agreement. Skip to action or technical acknowledgment.
- **External reviewer (skeptical):** Check 5 things before implementing — technically correct? Breaks existing? Full context? Cross-platform? Conflicts with prior decisions?

### YAGNI Check
If reviewer says "implement properly", grep for actual usage. Unused → propose removal. Used → implement.

### Implementation Order
1. Clarify unclear items FIRST (partial understanding = wrong implementation)
2. Blocker fixes (breaks, security)
3. Simple fixes (typos, imports)
4. Complex fixes (refactoring, logic)
5. Test each individually, verify no regressions

### When to Push Back
Suggestion breaks existing functionality, reviewer lacks context, violates YAGNI, technically incorrect for this stack, conflicts with architecture decisions. Use technical reasoning, not defensiveness.

### Graceful Correction
If you pushed back and were wrong: state factually — "You were right, checked [X], it does [Y]. Fixing now." No long apologies, no defending, no over-explaining.

## Scoring
- Critical safety → block before sub-agents
- Structural concern / spec deviation → changes requested
- Style/nit → follow-up note

## Anti-patterns
- Style before safety
- Rubber-stamping without reading diff
- Subjective preference changes
- Merging Standards + Spec findings (one axis masks the other)
- Proposing interfaces before user picks a candidate
- Performative agreement (thanking reviewer before verifying)
- Blind implementation of reviewer suggestions
- Mixing feedback handling modes
