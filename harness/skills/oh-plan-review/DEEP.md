# oh-plan-review — Deep Reference

## Lens Selection

| Keywords | Lens |
|----------|------|
| architecture, data model, API, types, modules | Engineering |
| UI, layout, colors, components, screens | Design |
| CLI, SDK, dev tool, API, npm package, docs | DX |
| product, strategy, scope, roadmap, business | Strategy |

## Engineering Lens

### Scope Challenge (before reviewing)
1. Does existing code already solve any sub-problem?
2. Minimum changes to achieve goal?
3. 8+ files or 2+ new classes/services → smell. Challenge.
4. Does framework have built-in for each pattern?
5. AI completeness is cheap — recommend full over shortcuts.
6. New artifact types need build/publish pipelines.

### Architecture Review
One section at a time: Architecture → Code Quality → Tests → Performance. Max 8 issues per section. Discuss each via AskUserQuestion. Anti-skip: evaluate every section; say "No issues found" if clean.

### Cognitive patterns (internalize)
- State diagnosis (Larson) — falling behind, treading, repaying debt, innovating?
- Blast radius — worst case = how many systems?
- Boring by default (McKinley) — proven tech unless you have innovation tokens
- Reversibility — make wrong answers cheap. Feature flags, incremental rollouts.
- Essential vs accidental complexity (Brooks) — real problem or self-inflicted?

## Design Lens

- Empty states — warmth, action, context when no data
- Visual hierarchy — what's seen first, second, third?
- Edge cases — long names, zero results, error, first-time vs power
- AI slop — generic card grids, 3-column features, hero sections? Flag.
- Responsive — every viewport intentional, not just stack-on-mobile
- A11y — keyboard, screen readers, contrast, touch targets

**Rule:** Specificity over vibes. "Clean, modern" is not a decision. Name the font, spacing, interaction, motion.

## DX Lens

**Evaluate:** Time to Hello World (< 2 min target). Error quality (problem + cause + fix). First 5 min friction. Progressive disclosure — simple case is prod-ready. Pit of Success — right thing is easy, wrong thing is hard.

**Modes:**
- **Expansion** — competitive advantage. Benchmark competitors.
- **Polish** — bulletproof every touchpoint.
- **Triage** — critical gaps only. Minimum viable DX.

## Strategy Lens

### Scope Modes
- **Expansion** — "10x better for 2x effort?" Present as AskUserQuestion.
- **Selective** — Surface cherry-pickable expansions. Neutral posture.
- **Hold** — Bulletproof. Catch every failure. No silent reduction.
- **Reduction** — Ruthless cut to MVP.

### Patterns (internalize)
- One-way vs two-way doors (Bezos) — most are two-way; move fast
- Inversion (Munger) — "how do we win?" + "what makes us fail?"
- Focus as subtraction (Jobs) — fewer things, better
- Proxy skepticism (Bezos) — metrics serving users or self-referential?
- Temporal depth — 5-10 year arcs. Regret minimization.

### Prime Directives
- Zero silent failures. Every failure mode visible.
- Every error named — exception class, trigger, catch, message.
- Data flows have shadow paths: nil, empty, upstream error. Trace all four.
- Observability is first-class — new dashboards/alerts are deliverables.
- Everything deferred written down or it doesn't exist.
- You have permission to say "scrap it and do this instead."

## Rules

- **Interactive only.** One section at a time via AskUserQuestion.
- **Anti-skip.** Every section evaluated. Zero findings → say so.
- **Commit to lens.** Once scope agreed, don't re-argue earlier decisions.

## Output

Plan file (`~/.local/share/opencode/openhermes/plans/<project-name>-plan-<nnn>.md`) updated with findings and decisions.

## Anti-patterns

- Using the wrong lens for the question
- Reviewing without reading the full plan first
- Merging concerns across lenses
- Skipping the interactive walkthrough
