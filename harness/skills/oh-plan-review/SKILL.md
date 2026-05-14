---
name: oh-plan-review
description: "Multi-lens plan review: 4 perspectives in one skill. Choose Engineering (architecture/scope), Design (UX/interaction), DX (API/CLI ergonomics), or Strategy (product/CEO). Interactive — walks through findings one section at a time."
tier: 3
benefits-from: [oh-planner, oh-expert]
triggers:
  - "plan review"
  - "review the plan"
  - "architecture review"
  - "design review"
  - "ux review"
  - "dx review"
  - "strategy review"
  - "eng review"
  - "ceo review"
---

# oh-plan-review

Four review lenses in one skill. Pick the lens that fits the plan's scope — or run multiple lenses in sequence for thorough coverage.

**Interactive.** Walk findings one section at a time with opinionated recommendations and AskUserQuestion gates. Never dump all findings at once.

**Read-only.** No code changes. The output is a better plan, not a document about the plan.

## Lens Selection

Ask the user which lens fits, or auto-detect from plan content:

| Trigger keywords | Recommended lens |
|---|---|
| architecture, data model, API design, file structure, types, modules | Engineering |
| UI, layout, colors, components, screens, mockups, user interface | Design |
| CLI, SDK, developer tool, API, npm package, documentation, onboarding | DX |
| product, strategy, scope, roadmap, competition, business model | Strategy |

### Engineering Lens
Scope challenge, architecture review, cognitive patterns for eng managers.

**Scope Challenge** — Before reviewing anything:
1. What existing code already partially solves each sub-problem?
2. What is the minimum set of changes that achieves the stated goal?
3. Complexity check: 8+ files or 2+ new classes/services → smell. Challenge it.
4. Search check: does the runtime/framework have built-in support for each pattern the plan introduces?
5. Completeness check: with AI-assisted coding, the cost of completeness is 10-100x cheaper. Recommend complete lakes over shortcuts.
6. Distribution check: new artifact types need build/publish pipelines.

**Architecture Review** — Walk through one section at a time: Architecture → Code Quality → Tests → Performance. Max 8 top issues per section. Use AskUserQuestion to discuss each finding.

**Anti-skip rule:** Never condense or skip a section. If a section has zero findings, say so — but evaluate it.

**Cognitive patterns** (internalize, don't enumerate):
- State diagnosis (Larson) — Is your team falling behind, treading water, repaying debt, or innovating?
- Blast radius instinct — What's the worst case and how many systems does it affect?
- Boring by default (McKinley) — Proven technology unless you have innovation tokens to spend.
- Reversibility preference — Feature flags, incremental rollouts. Make wrong answers cheap.
- Essential vs accidental complexity (Brooks) — Is this solving a real problem or one we created?

### Design Lens
UX review, interaction state coverage, AI slop detection.

**Evaluate:**
- Empty states — every screen without data needs warmth, action, context
- Visual hierarchy — what does the user see first, second, third?
- Edge cases — 47-char names, zero results, error states, first-time vs power user
- AI slop — generic card grids, hero sections, 3-column features? Flag them.
- Responsive — every viewport gets intentional design, not just stack-on-mobile
- Accessibility — keyboard nav, screen readers, contrast, touch targets

**Principle:** Specificity over vibes. "Clean, modern UI" is not a design decision. Name the font, spacing scale, interaction pattern, and motion.

### DX Lens
Developer experience audit for APIs, CLIs, SDKs, libraries, platforms.

**Evaluate:**
- Time to Hello World — target < 2 minutes. Every extra minute drops adoption 20-30%.
- Error quality — every error = problem + cause + fix. No "something went wrong."
- First five minutes — one click to start. No credit card. No demo call.
- Progressive disclosure — simple case is production-ready. Complex case uses the same API.
- Pit of Success — make the right thing easy, the wrong thing hard.

**Three modes:**
- **DX Expansion** — competitive advantage. Design magical moments. Benchmark competitors.
- **DX Polish** — bulletproof every touchpoint. No friction, no uncertainty.
- **DX Triage** — critical gaps only. Minimum viable DX investment.

### Strategy Lens
Product/CEO review with 4 scope modes.

**Select mode:**
- **Scope Expansion** — "What would make this 10x better for 2x the effort?" Push scope up. Present each expansion as an AskUserQuestion. The user opts in or out.
- **Selective Expansion** — Hold the baseline. Surface expansion opportunities for cherry-picking. Neutral recommendation posture.
- **Hold Scope** — Make it bulletproof. Catch every failure mode. No silent reduction or expansion.
- **Scope Reduction** — Find the minimum viable version. Be ruthless. Cut everything non-essential.

**Cognitive patterns** (internalize):
- Classification instinct (Bezos) — One-way vs two-way doors. Most things are two-way; move fast.
- Inversion reflex (Munger) — For every "how do we win?" also ask "what would make us fail?"
- Focus as subtraction (Jobs) — Default: do fewer things, better. 350 products → 10.
- Proxy skepticism (Bezos) — Are our metrics still serving users or self-referential?
- Temporal depth — Think in 5-10 year arcs. Apply regret minimization for major bets.

**Prime directives:**
- Zero silent failures. Every failure mode must be visible.
- Every error has a name. Don't say "handle errors." Name the exception class, trigger, catch, user-facing message.
- Data flows have shadow paths: nil, empty, upstream error. Trace all four.
- Observability is scope, not afterthought. New dashboards and alerts are first-class deliverables.
- Everything deferred must be written down. TODOS.md or it doesn't exist.
- You have permission to say "scrap it and do this instead."

## Output

After each lens, the plan file (`/.opencode/plan.md`) is updated with findings and decisions. The user reviews and accepts changes interactively.

## Rules

- **Interactive only.** One section at a time. Use AskUserQuestion to discuss findings before writing.
- **Anti-skip:** Every section must be evaluated. If zero findings, say "No issues found" and move on.
- **Anti-shortcut:** The plan file is the OUTPUT of the interactive review, not a substitute for it. Findings go through AskUserQuestion before writing.
- **Commit to the chosen lens.** Once scope is agreed, don't re-argue earlier decisions in later sections.

## Routing

| Outcome | Route |
|---------|-------|
| pass | → oh-grill (if concerns remain) or oh-manifest (execute plan) |
| fail | → oh-planner (revise plan based on findings) |
| blocker | → surface to user |
