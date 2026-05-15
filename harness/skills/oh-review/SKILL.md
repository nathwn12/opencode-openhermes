---
name: oh-review
description: "Two-axis code and design review: Standards (conformance) + Spec (fidelity) in parallel sub-agents. Includes architecture deepening analysis."
tier: 3
benefits-from: [oh-expert]
triggers:
  - "code review please"
  - "review the code"
  - "review the PR"
  - "review changes since"
  - "pr review"
  - "design review"
  - "review this code"
route:
  pass:
    - oh-gauntlet
    - oh-ship
  fail: oh-builder
  blocker: surface
---

# oh-review

Two-axis review of the diff between HEAD and a fixed point. Both axes run as parallel sub-agents, then findings are aggregated. Three modes: **Diff Review**, **Architecture Deepening**, or both in sequence.

## When to Use
Before merging any PR or landing changes. When you need a quality gate that catches both code-quality violations and spec deviations.

## Mode Selection
- **Diff Review** (default) — Standards + Spec review of a changeset
- **Architecture Deepening** — Surface refactoring opportunities in the codebase
- **Full Review** — Both: diff review first, then architecture deepening pass

---

## Mode A: Diff Review

### 1. Pin the Fixed Point
The user provides a branch, commit SHA, or tag. Capture `git diff <fixed-point>...HEAD` and `git log <fixed-point>..HEAD --oneline`.

### 2. Identify the Spec Source
Look for the originating spec in this order:
1. Issue references in commit messages (`#123`, `Closes #45`) — fetch via `docs/agents/issue-tracker.md`
2. A path the user passed as an argument
3. A PRD/spec file under `docs/`, `specs/`, or `.scratch/`
4. Ask the user

If no spec exists, the Spec sub-agent skips and reports "no spec available."

### 3. Identify the Standards Sources
Collect all files documenting how code should be written:
- AGENTS.md, CLAUDE.md, CONTRIBUTING.md
- CONTEXT.md, ADRs
- eslint/biome/prettier config (note tool-enforced ones — don't re-check)


### 4. Spawn Both Sub-Agents (parallel)

**Standards sub-agent:** Read the standards docs and the diff. Report per-file/hunk every place the diff violates a documented standard. Cite the standard source + rule. Distinguish hard violations from judgement calls. Skip anything tooling enforces.

**Spec sub-agent:** Read the spec and the diff. Report: (a) requirements missing or partial, (b) scope creep, (c) requirements implemented but wrong. Quote the spec line for each finding.

### 5. Aggregate
Present findings under `## Standards` and `## Spec` headings. Do NOT merge or rerank — the two axes are deliberately separate. End with one-line summary: total findings per axis and the worst single issue.

### Safety Check (always run inline before spawning sub-agents)
- SQL injection vectors
- LLM trust boundary violations
- Conditional side effects (test vs prod)
- Hardcoded secrets

Block immediately if critical safety issue found — do not spawn sub-agents.

---

## Mode B: Architecture Deepening

Surface deepening opportunities — refactors that turn shallow modules into deep ones. Uses the **deletion test**: if deleting a module would concentrate complexity (not just move it), the module is earning its keep. If complexity vanishes, the module was a pass-through.

### Vocabulary
Use these terms exactly:
- **Module** — anything with an interface and an implementation
- **Depth** — leverage at the interface: lots of behavior behind a small interface
- **Seam** — where an interface lives; a place behavior can be altered without editing in place
- **Leverage** — what callers get from depth
- **Locality** — what maintainers get from depth: change concentrated in one place

### Process
1. **Explore** — Read CONTEXT.md and ADRs. Walk the codebase noting friction:
   - Where does understanding one concept require bouncing between many small modules?
   - Where are modules shallow (interface as complex as implementation)?
   - Where are pure functions extracted for testability but real bugs hide in how they're called?
   - Apply the deletion test to suspected shallow modules
2. **Present candidates** — Numbered list. For each: files, problem, solution, benefits in terms of locality/leverage. Flag ADR conflicts.
3. **Grilling loop** — Walk the design tree with the user. Side effects: update CONTEXT.md for new terms, offer ADRs for rejected candidates.
4. **Output** — Ranked refactoring candidates with collision warnings.

## Scoring
- Critical safety issue → block immediately (before sub-agents)
- Structural concern → changes requested
- Spec deviation → changes requested (with reference)
- Style/nit → note for follow-up

## Anti-patterns
- Reviewing style before safety (wrong priority order)
- Rubber-stamping without reading the diff
- Requesting changes for subjective preferences
- Merging Standards and Spec findings (one axis masks the other)
- Proposing interfaces in deepening mode before the user picks a candidate

## Routing

| Outcome | Route |
|---------|-------|
| pass | → oh-gauntlet (if code changes needed) or oh-ship |
| fail | → oh-builder (fix violations found) |
| blocker | → surface to user |
