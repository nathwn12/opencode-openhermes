---
name: oh-skill-craft
description: "Create new agent skills with proper structure, frontmatter, progressive disclosure, and bundled resources. Meta-skill for growing the harness."
tier: 2
benefits-from: [oh-expert]
triggers:
  - "create a skill"
  - "write a skill"
  - "new skill"
  - "skill-craft"
  - "meta-skill"
  - "add a capability"
route:
  pass: oh-skills-link
  fail: oh-expert
  blocker: surface
---

# oh-skill-craft

Create new agent skills for the OpenHermes harness. Skills load on demand — the unit of progressive disclosure.

## Structure
```
harness/skills/<oh-name>/
├── SKILL.md        # Main instructions (required)
├── REFERENCE.md    # Extended docs (if SKILL.md > 100 lines)
└── scripts/        # For deterministic operations (validation, formatting)
```

## Template
```markdown
---
name: oh-<name>
description: "Brief. Use when [triggers]."
tier: <2|3|4>
triggers: ["<phrase>"]
route:
  pass: <next>
  fail: <fallback>
  blocker: surface
---

# oh-<name>

<one-paragraph summary>

## When to Use

## Workflow

1. Step

## Anti-patterns

- List
```

## Field Guide

| Field | Purpose |
|-------|---------|
| `name` | Must match `^[a-z0-9]+(-[a-z0-9]+)*$` and directory name |
| `description` | Max 200 chars. What + when. First sentence = function, second = trigger context. |
| `tier` | 2=tool, 3=strategic, 4=autonomous |
| `triggers` | Natural language patterns for routing |

## Output Location
User-written skills → `~/.config/opencode/skills/` (survives npm update). On name conflict, user version wins. Built-in skills live in `harness/skills/` and get replaced on update.

## Review Checklist
- [ ] Description includes triggers ("Use when...")
- [ ] SKILL.md under 100 lines
- [ ] No time-sensitive info (dates, versions)
- [ ] Consistent oh- prefix and terminology
- [ ] Concrete examples included
- [ ] Anti-patterns documented
- [ ] Tests still pass (`npm test`)

## Eval-Driven Iteration

After drafting, iterate with evidence — not guessing. Test prompts should be substantive multi-step tasks, not trivial reads. The model handles simple tasks without a skill — evals reveal whether the skill pulls its weight on hard cases.

### 1. Create Test Cases
2-3 realistic multi-step prompts that mirror real usage. Save to `evals/evals.json`:
```json
{"skill_name": "oh-<name>", "evals": [{"id": 1, "prompt": "Realistic multi-step task", "expected_output": "Concrete expected result", "files": []}]}
```

### 2. Spawn Runs
Parallel subagents: **with-skill** (load skill, execute) vs **baseline** (no skill, or previous version). Save outputs to `iteration-N/eval-ID/with_skill/` and `iteration-N/eval-ID/baseline/`.

### 3. Draft Assertions
While runs execute, draft objectively verifiable assertions for each test case. Good assertions have descriptive names and can be checked programmatically. Update `evals/evals.json`.

### 4. Grade
Aggregate pass rates, timing, token usage per assertion. Look for:
- **Non-discriminating** — always passes regardless of skill (remove them)
- **High-variance** — possibly flaky tests
- **Time/token tradeoffs** — does the skill justify its cost?

### 5. Improve
Revise based on failures. Generalize from specific patterns — don't overfit to 2-3 test cases. The goal is a skill that works across a million prompts. Keep instructions lean.

### 6. Loop
Rerun all tests into a new iteration directory. Repeat until: user satisfied, all feedback positive, or no meaningful progress between iterations.

## Description Optimization

After the skill is solid, optimize its description for triggering accuracy.

Create 20 eval queries — 10 should-trigger (different phrasings, contexts) and 10 should-not-trigger (near-misses sharing keywords but need a different skill). Queries must be realistic with concrete details, not abstract. Iterate the description, test against the eval set, select the winner.

## Routing

| Outcome | Route |
|---------|-------|
| pass | → oh-skills-link (verify discovery) |
| iteration data | → oh-learn (extract patterns) |
| fail | → oh-expert (diagnose) |
| blocker | → surface |
