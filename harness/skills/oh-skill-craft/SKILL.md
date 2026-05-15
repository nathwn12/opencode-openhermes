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

Create new agent skills for the OpenHermes harness. Skills are the unit of progressive disclosure — loaded on demand, not preloaded.

## Skill Structure

```
harness/skills/<oh-name>/
├── SKILL.md           # Main instructions (required)
├── REFERENCE.md       # Detailed docs (if SKILL.md exceeds 100 lines)
└── scripts/           # Utility scripts (if deterministic operations needed)
```

## SKILL.md Template

```markdown
---
name: oh-<name>
description: "Brief description. Use when [specific triggers]."
tier: <2|3|4>
benefits-from: [<skill-dependencies>]
triggers:
  - "<trigger phrase>"
  - "<another trigger>"
---

# oh-<name>

<one-paragraph summary>

## When to Use

<when to invoke this skill>

## Workflow

1. <step>
2. <step>
3. <step>

## Anti-patterns

- <anti-pattern 1>
- <anti-pattern 2>
```

## Description Requirements

The description is the only thing the agent sees when deciding which skill to load. Make it actionable:

**Good:** "Create new agent skills with proper structure, frontmrmatter, and bundled resources. Use when user wants to create, write, or build a new skill."

**Bad:** "Helps with skills."

## Field Guide

| Frontmatter Field | Required | Purpose |
|---|---|---|
| `name` | yes | Must match `^[a-z0-9]+(-[a-z0-9]+)*$` and directory name |
| `description` | yes | Max 200 chars. First sentence = what it does. Second = when to use. |
| `tier` | no | 2=tool, 3=strategic, 4=autonomous. Controls preamble verbosity. |
| `benefits-from` | no | Skill dependencies. Listed skills should be loaded first. |
| `triggers` | no | Natural language patterns that should route to this skill. |

## When to Add Scripts
- Operation is deterministic (validation, formatting)
- Same code would be generated repeatedly
- Errors need explicit handling

Scripts save tokens and improve reliability vs generated code.

## Output Location

Skills created with oh-skill-craft should be written to `~/.config/opencode/skills/` (or `~/.agents/skills/` if the user prefers). Built-in skills live in the package `harness/skills/` and get replaced on npm update. User-written skills in `~/.config/opencode/skills/` survive updates and are auto-discovered on every session. On name conflict with a built-in skill, the user version wins.

## When to Split Files
- SKILL.md exceeds 100 lines
- Content has distinct domains
- Advanced features are rarely used (put in REFERENCE.md)

## Review Checklist

- [ ] Description includes triggers ("Use when...")
- [ ] SKILL.md under 100 lines
- [ ] No time-sensitive info (dates, versions, deprecation warnings)
- [ ] Consistent oh- prefix and terminology
- [ ] Concrete examples included
- [ ] Anti-patterns documented
- [ ] Tests still pass after adding (`npm test`)

## Eval-Driven Iteration

After writing the initial skill draft, iterate using test cases and evidence rather than guessing.

### 1. Create Test Cases

Come up with 2-3 realistic test prompts — the kind of thing a real user would actually say. Save to `evals/evals.json`:

```json
{
  "skill_name": "oh-<name>",
  "evals": [
    {
      "id": 1,
      "prompt": "User's realistic task prompt",
      "expected_output": "Description of expected result",
      "files": []
    }
  ]
}
```

Good test prompts are substantive multi-step tasks — not simple queries like "read this file." The model can handle simple tasks without a skill. Complex, multi-step, or specialized queries reveal whether the skill is pulling its weight.

### 2. Spawn Runs

For each test case, spawn two subagents in parallel:
- **With-skill run** — load the skill, execute the task
- **Baseline run** — same prompt without the skill (for new skills) or with the previous version (for improvements)

Save outputs to `iteration-<N>/eval-<ID>/with_skill/outputs/` and `iteration-<N>/eval-<ID>/without_skill/outputs/`.

### 3. Draft Assertions

While runs execute, draft objectively verifiable assertions for each test case. Good assertions have descriptive names and can be checked programmatically where possible. Update `evals/evals.json` with the assertions.

### 4. Grade and Compare

Grade runs against assertions. Aggregate results into pass rates, timing, and token usage. Look for:
- Assertions that always pass regardless of skill (non-discriminating — remove them)
- High-variance evals (possibly flaky tests)
- Time/token tradeoffs between skill and baseline

### 5. Improve

Based on results, revise the skill. Generalize from specific failures rather than overfitting to the test cases. The goal is a skill that works across a million different prompts, not just 2-3 examples. Keep instructions lean — remove anything not pulling its weight.

### 6. Loop

Rerun all test cases into a new iteration directory. Repeat until:
- User says they're happy
- All feedback is positive
- No meaningful progress between iterations

## Description Optimization

The description field in frontmatter is the primary mechanism for skill triggering. After the skill is solid, optimize the description for accuracy.

### Trigger Eval Queries

Create 20 eval queries — a mix of should-trigger and should-not-trigger cases:

```json
[
  {"query": "realistic user prompt that should trigger", "should_trigger": true},
  {"query": "near-miss prompt that should NOT trigger", "should_trigger": false}
]
```

Key principles:
- **Should-trigger** (8-10): different phrasings of the same intent — formal, casual. Include edge cases and contexts where this skill competes with another but should win.
- **Should-not-trigger** (8-10): near-misses that share keywords but need a different skill. Avoid obviously irrelevant queries — the hard cases are the adjacent ones.

Queries must be realistic — what a user would actually type, with concrete details, not abstract descriptions.

### Run Optimization

Iterate the description: test current, propose improvements based on failures, re-test. Select the description that scores best on held-out test data. Apply the winner to the skill's frontmatter.

## Routing

| Outcome | Route |
|---------|-------|
| pass | → oh-skills-link (verify skill discovery) |
| iteration data available | → oh-learn (extract patterns from eval results) |
| fail | → oh-expert (diagnose skill creation issues) |
| blocker | → surface to user |
