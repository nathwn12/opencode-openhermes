# oh-plan-review — Engineering Lens

### Engineering Lens

**Scope Challenge** (before reviewing):
1. Does existing code already solve any sub-problem?
2. Minimum changes to achieve goal?
3. 8+ files or 2+ new classes/services → smell. Challenge.
4. Does framework have built-in for each pattern?
5. AI completeness is cheap — recommend full over shortcuts.
6. New artifact types need build/publish pipelines.

**Architecture Review** — one section at a time: Architecture → Code Quality → Tests → Performance. Max 8 issues per section. Discuss each via AskUserQuestion. Anti-skip: evaluate every section; say "No issues found" if clean.

**Cognitive patterns** (internalize):
- State diagnosis (Larson) — falling behind, treading, repaying debt, innovating?
- Blast radius — worst case = how many systems?
- Boring by default (McKinley) — proven tech unless you have innovation tokens
- Reversibility — make wrong answers cheap. Feature flags, incremental rollouts.
- Essential vs accidental complexity (Brooks) — real problem or self-inflicted?
