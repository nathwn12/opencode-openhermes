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

### Safety Check (inline before spawning)
- SQL injection, LLM trust boundary violations, conditional side effects (test vs prod), hardcoded secrets
- Block immediately if critical — do not spawn sub-agents.

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
