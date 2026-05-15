## Phase 4: Audit

Input: built code + DESIGN.md. Output: ranked pass/fail report.

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
