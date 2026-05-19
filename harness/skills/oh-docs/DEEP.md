# oh-docs — Deep Reference

## When to Use

After code ships (called by oh-ship) or when asked to "write docs", "document this feature", "update the docs", "generate documentation". Proactively suggest after a PR is merged.

## Diataxis Framework

The four quadrants of documentation, each serving a different reader need:

| Quadrant | Orientation | Reader Goal | Best For |
|----------|-------------|-------------|----------|
| **Tutorial** | Learning-oriented | Walk through a working example step-by-step | Newcomers, getting started |
| **How-to** | Task-oriented | Accomplish a specific goal | Users who know the basics |
| **Reference** | Information-oriented | Complete, accurate technical description | Everyone needing facts |
| **Explanation** | Understanding-oriented | Why things work the way they do | Deep understanding |

### Partitioning Decision Matrix

| Entity type | Tutorial? | How-to? | Reference? | Explanation? |
|---|---|---|---|---|
| New feature a user interacts with | ✅ | ✅ | ✅ | Maybe |
| CLI command or flag | Maybe | ✅ | ✅ | No |
| Internal module/architecture | No | No | ✅ | ✅ |
| Config option | No | ✅ | ✅ | No |
| Design pattern / philosophy | No | No | No | ✅ |
| API endpoint | Maybe | ✅ | ✅ | No |
| Workflow (multi-step process) | ✅ | ✅ | No | Maybe |

## Step 0: Scope & Intent (standalone only)

1. Determine what to document:
   - **Specific target** (feature, module, file): scope is that target
   - **Full project**: scope is the whole surface
   - **From oh-ship with gaps**: scope is specific entities from the coverage map

2. Ask user about output format:
   - A) Inline updates to existing files (README, ARCHITECTURE)
   - B) Standalone `docs/` files
   - C) Both (recommended)

3. Follow existing conventions: `docs/` directory structure, doc framework (Nextra, Docusaurus, MkDocs, VitePress), or plain Markdown.

## Step 1: Codebase Archaeology (Research Phase)

**Do not skip.** Doc quality is proportional to code understanding.

1. Map project structure:
   - Entry points (index.ts, main.rs, app.py)
   - package.json / Cargo.toml / pyproject.toml
   - README, ARCHITECTURE, CONTRIBUTING, AGENTS.md

2. Read source code for each target entity:
   - Implementation files end-to-end (not just signatures)
   - Tests — they reveal intended behavior and edge cases
   - Related modules (dependencies and dependents)
   - Inline comments: `// NOTE:`, `// DESIGN:`, `// WHY:`

3. Build concept map before writing:

```
Target: [entity name]
Purpose: [what problem does it solve?]
Key concepts: [3-5 things a reader must understand]
Public surface: [commands, functions, config options, API endpoints]
Dependencies: [what it needs from other modules]
Edge cases: [from reading tests and code]
Design decisions: [non-obvious "why" choices]
```

4. Report: "Researched N files, identified K public surface items, M concepts."

## Step 2: Diataxis Coverage Map

Read existing documentation and classify coverage per entity:

```
Coverage map:
  [entity]              [tutorial] [how-to] [reference] [explanation]
  Widget system         ❌ gap     ❌ gap   ✅ exists   ❌ gap
  --verbose flag        ❌         ❌ gap   ✅ inline   ❌
  Bayesian scheduler    ❌         ❌       ❌ gap      ❌ gap
```

Report overall coverage: "X/Y quadrants covered (Z%). Priority gaps: [top 3]."

## Step 3: Writing Order

Always write in this order:

1. **Reference first** — Facts don't change. Get the complete, accurate description down.
2. **Explanation second** — Understanding builds on facts. Now explain the "why."
3. **How-to third** — Tasks depend on understanding the surface. Now guide through goals.
4. **Tutorial last** — Tutorials depend on everything else. Walk through end-to-end.

### Reference Documentation
- Complete, accurate, no gaps
- Every function/command/config option documented
- Types, signatures, return values, error conditions
- Examples for non-obvious usage

### Explanation Documentation
- Design decisions and trade-offs
- Architecture rationale
- Why not alternative approaches
- Conceptual model

### How-To Guides
- Specific goal, repeatable steps
- Prerequisites listed upfront
- Expected outcomes per step
- Troubleshooting for common failure points

### Tutorials
- Step-by-step, working example
- Prerequisites, expected time
- Clear start and end states
- Verification at each step

## Step 4: Drift Detection

Compare architecture diagrams in docs against actual code:

1. Read ARCHITECTURE.md diagrams (ASCII, Mermaid, PlantUML)
2. Trace actual module boundaries and dependency direction
3. Flag mismatches: renamed modules, removed dependencies, new boundaries
4. Fix diagrams or annotate with `[drift: verified as of YYYY-MM-DD]`

## Step 5: CHANGELOG Polish

Apply the sell-test rubric to each CHANGELOG entry:

| Test | Pass if... | Fail if... |
|------|-----------|------------|
| **Sell test** | A user reading this knows why it matters | Technical description only, no user impact |
| **Clarity test** | Non-contributor understands what changed | Jargon-heavy, assumes internal knowledge |
| **Scope test** | Entry describes one logical change | Multiple unrelated changes in one entry |

Fix failing entries. Merge adjacent entries describing the same feature.

## Step 6: Quality Self-Review

Before committing, verify:

- [ ] Every changed entity has reference coverage
- [ ] All code samples compile/run (verify with tests)
- [ ] Cross-links between related documents
- [ ] No placeholder text, TODOs, or lorem ipsum
- [ ] Entry point docs (README) link to new standalone docs
- [ ] Every new doc is reachable within 2 clicks from README
- [ ] Architecture diagrams match actual code

## Anti-patterns

- Writing any doc before reading the code
- Tutorials that assume knowledge the user doesn't have yet
- Reference docs with gaps ("TODO: add more")
- How-to guides with no troubleshooting section
- Skipping diagram drift check
- CHANGELOG entries that describe code changes instead of user impact
- Generating docs the user didn't ask for (scope creep)
