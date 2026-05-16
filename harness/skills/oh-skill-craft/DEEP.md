# oh-skill-craft — Deep Reference

## Skill Structure and Template

### Directory Layout

Every skill lives in its own directory under the harness:

```
harness/skills/<oh-name>/
├── SKILL.md        # Main instructions (required)
├── REFERENCE.md    # Extended docs (if SKILL.md > 100 lines)
└── scripts/        # For deterministic operations (validation, formatting)
```

### Template

Every SKILL.md follows this structure:

```markdown
---
name: oh-<name>
description: "Brief. Use when [triggers]."
tier: <2|3|4>
route:
  pass: <next>
  fail: <fallback>
  blocker: surface
---

# oh-<name>

<one-paragraph summary>

## When to Use

## Steps

1. Step

## Anti-patterns

- List
```

### Field Guide

| Field | Purpose |
|-------|---------|
| `name` | Must match `^[a-z0-9]+(-[a-z0-9]+)*$` and directory name |
| `description` | Max 200 chars. First sentence = function, second = trigger context. |
| `tier` | 2=tool (deterministic), 3=strategic (analysis/decisions), 4=autonomous (multi-step process) |
| `route.pass` | Next skill after successful completion |
| `route.fail` | Fallback skill on failure or edge case |
| `route.blocker` | Where to surface blockers (usually "surface") |

## Output Location and Review Checklist

### Output Location

Skills are stored in two locations with a precedence rule:

| Location | Path | Behavior |
|----------|------|----------|
| **User-written** | `~/.config/opencode/skills/` | Survives npm update. User edits persist across reinstalls. |
| **Built-in** | `harness/skills/` in the package | Gets replaced on package update. |

**Name conflict rule**: On name conflict, user version wins. If a user has `~/.config/opencode/skills/oh-expert/SKILL.md`, that takes precedence over the built-in version.

### Review Checklist

Before marking a skill complete, verify every item:

- [ ] **Description includes triggers** — "Use when..." phrasing in description field
- [ ] **SKILL.md under 100 lines** — If longer, chunk into sections or create REFERENCE.md
- [ ] **No time-sensitive info** — No dates, version numbers, or ephemeral references
- [ ] **Consistent oh- prefix and terminology** — Follow naming conventions from existing skills
- [ ] **Concrete examples included** — Show real usage, not abstract descriptions
- [ ] **Anti-patterns documented** — What NOT to do, common mistakes
- [ ] **Tests still pass** — Run `npm test` (or project-equivalent) to verify no regressions

## Eval-Driven Iteration

After drafting a skill, iterate with evidence — not guessing. Test prompts should be substantive multi-step tasks that mirror real usage. The model handles simple tasks without a skill — evals reveal whether the skill pulls its weight on hard cases.

### 6-Step Loop

#### 1. Create Test Cases
Write 2-3 realistic multi-step prompts that mirror real usage. Save to `evals/evals.json`:

```json
{
  "skill_name": "oh-<name>",
  "evals": [
    {
      "id": 1,
      "prompt": "Realistic multi-step task the skill should handle",
      "expected_output": "Concrete expected result description",
      "files": []
    }
  ]
}
```

#### 2. Spawn Runs
Launch parallel subagents: **with-skill** (load the skill, execute prompt) vs **baseline** (no skill loaded, or previous version). Use the same prompt for both.

Save outputs to:
- `iteration-N/eval-ID/with_skill/`
- `iteration-N/eval-ID/baseline/`

#### 3. Draft Assertions
While runs execute, draft objectively verifiable assertions for each test case. Good assertions:
- Have descriptive names
- Can be checked programmatically (output contains X, file Y was created, step Z was followed)
- Update `evals/evals.json` with these assertions

#### 4. Grade
Aggregate results per assertion:
- **Pass rates** — Which assertions pass/fail with vs without the skill
- **Timing** — How long each run takes
- **Token usage** — Cost comparison

Look for:
- **Non-discriminating** assertions — always pass regardless of skill → remove them (they add noise)
- **High-variance** results — possibly flaky tests → investigate
- **Time/token tradeoffs** — does the skill justify its cost in latency and tokens?

#### 5. Improve
Revise the skill based on failures. Important rules:
- **Generalize** from specific failure patterns — don't overfit to 2-3 test cases
- The goal is a skill that works across a million prompts, not just your test set
- Keep instructions lean — every word should earn its place

#### 6. Loop
Rerun all tests into a new iteration directory. Repeat until one of:
- User is satisfied
- All feedback is positive
- No meaningful progress between iterations

## Description Optimization

After the skill body is solid, optimize its `description` field for triggering accuracy. The description is what the routing system uses to match queries to skills.

### Process

#### 1. Create 20 Eval Queries
Construct a balanced eval set:

| Type | Count | Purpose |
|------|-------|---------|
| **Should-trigger** | 10 | Different phrasings and contexts where this skill is the correct answer |
| **Should-not-trigger** | 10 | Near-misses that share keywords but need a different skill |

#### 2. Quality Rules
- Queries must be **realistic** — phrases users actually type, not academic exercises
- Include **concrete details** — "create a skill for validating YAML configs" not "make a skill"
- Should-not-trigger queries should be **genuinely confusable** — if they're obviously unrelated, the test is useless

#### 3. Iterate Description
Write candidate descriptions. For each candidate:
- Score it against the eval set
- How many should-trigger queries does it catch?
- How many should-not-trigger does it correctly reject?
- Tune phrasing, keywords, and structure

#### 4. Select Winner
The description with the best precision/recall balance wins. Record it in the skill frontmatter.

## Effectiveness and Testing

### 1. TDD for Skills Methodology

**Writing skills IS Test-Driven Development applied to process documentation.**

You write test cases (pressure scenarios), watch them fail (baseline agent behavior), write the skill (the documentation), watch tests pass (agents comply), and refactor (close loopholes).

**Core principle:** If you didn't watch an agent fail without the skill, you don't know if the skill teaches the right thing.

#### TDD Mapping

| TDD Concept | Skill Creation |
|-------------|----------------|
| **Test case** | Pressure scenario with subagent |
| **Production code** | Skill document (`SKILL.md`) |
| **Test fails (RED)** | Agent violates rule without skill (baseline) |
| **Test passes (GREEN)** | Agent complies with skill present |
| **Refactor** | Close loopholes while maintaining compliance |
| **Write test first** | Run baseline scenario BEFORE writing skill |
| **Watch it fail** | Document exact rationalizations agent uses |
| **Minimal code** | Write skill addressing those specific violations |
| **Watch it pass** | Verify agent now complies |
| **Refactor cycle** | Find new rationalizations → plug → re-verify |

#### The Iron Law
```
NO SKILL WITHOUT A FAILING TEST FIRST
```
This applies to NEW skills AND EDITS to existing skills. No exceptions.

#### RED Phase — Write Failing Test
Run a pressure scenario with a subagent WITHOUT the skill. Document exact behavior:
- What choices did they make?
- What rationalizations did they use (verbatim)?
- Which pressures triggered violations?

#### GREEN Phase — Write Minimal Skill
Write a skill that addresses those specific rationalizations. Do not add extra content for hypothetical cases. Run the same scenario WITH the skill. The agent should now comply.

#### REFACTOR Phase — Close Loopholes
Agent found a new rationalization? Add an explicit counter. Re-test until bulletproof.

### 2. Claude Search Optimization (CSO)

**Critical for discovery — and for correct behavior.** The description field determines both *whether* a skill is loaded and *how* the agent uses it.

#### Description = When to Use, NOT What the Skill Does
When a description summarizes the skill's workflow, the agent may follow the description instead of reading the full skill content. The skill body becomes documentation the agent skips if the description gives away the process.

#### Bad vs. Good Descriptions
```yaml
# ❌ BAD: Summarizes workflow
description: Use when executing plans - dispatches subagent per task with code review between tasks

# ❌ BAD: Too much process detail
description: Use for TDD - write test first, watch it fail, write minimal code, refactor

# ❌ BAD: Too abstract, vague
description: For async testing

# ❌ BAD: First person
description: I can help you with async tests when they're flaky

# ✅ GOOD: Just triggering conditions, no workflow summary
description: Use when executing implementation plans with independent tasks in the current session

# ✅ GOOD: Describes the problem
description: Use when tests have race conditions, timing dependencies, or pass/fail inconsistently
```

**Rules:**
- Start with "Use when..." to focus on triggering conditions
- Describe the *problem*, not *language-specific symptoms*
- Keep triggers technology-agnostic unless the skill itself is technology-specific
- Write in third person
- **NEVER summarize the skill's process or workflow**

#### Keyword Coverage
Use words the agent would search for:
- **Error messages:** "Hook timed out", "ENOTEMPTY", "race condition"
- **Symptoms:** "flaky", "hanging", "zombie", "pollution"
- **Synonyms:** "timeout/hang/freeze", "cleanup/teardown/afterEach"
- **Tools:** Actual commands, library names, file types

### 3. Bulletproofing Techniques

Skills that enforce discipline need to resist rationalization. Agents are smart and will find loopholes when under pressure.

#### Close Every Loophole Explicitly
Don't just state the rule — forbid specific workarounds:
```markdown
<!-- ✅ Good -->
Write code before test? Delete it. Start over.
No exceptions:
- Don't keep it as "reference"
- Don't "adapt" it while writing tests
- Don't look at it
- Delete means delete
```

#### Address "Spirit vs Letter" Arguments
Add a foundational principle early:
```markdown
**Violating the letter of the rules is violating the spirit of the rules.**
```

#### Build Rationalization Table
| Excuse | Reality |
|--------|---------|
| "Skill is obviously clear" | Clear to you ≠ clear to other agents. Test it. |
| "It's just a reference" | References can have gaps, unclear sections. Test retrieval. |
| "Testing is overkill" | Untested skills have issues. Always. 15 min testing saves hours. |
| "I'll test if problems emerge" | Problems = agents can't use skill. Test BEFORE deploying. |
| "Too tedious to test" | Testing is less tedious than debugging bad skill in production. |
| "I'm confident it's good" | Overconfidence guarantees issues. Test anyway. |
| "Academic review is enough" | Reading ≠ using. Test application scenarios. |
| "No time to test" | Deploying untested skill wastes more time fixing it later. |

**All of these mean: Test before deploying. No exceptions.**

#### Create Red Flags List
```markdown
## Red Flags — STOP and Start Over
- Code before test
- "I already manually tested it"
- "Tests after achieve the same purpose"
- "It's about spirit not ritual"
- "This is different because..."
```

### 4. Pressure Testing Methodology

Different skill types need different test approaches.

| Skill Type | Test Approach | Success Criteria |
|------------|---------------|-----------------|
| Discipline-Enforcing | Academic questions, pressure scenarios, multiple pressures combined | Agent follows rule under maximum pressure |
| Technique | Application scenarios, variation, missing information tests | Agent applies technique to new scenario |
| Pattern | Recognition scenarios, application, counter-examples | Agent correctly identifies when/how to apply |
| Reference | Retrieval scenarios, application, gap testing | Agent finds and applies reference information |

#### Combine 3+ Pressures
For discipline-enforcing skills, combine multiple pressures to find breaking points:

| Pressure Type | Description |
|---------------|-------------|
| **Time** | "This is urgent, just this once skip the rule" |
| **Sunk cost** | "I already wrote the code, starting over wastes work" |
| **Authority** | "The user asked me to do it this way" |
| **Exhaustion** | "After 10 tests, one shortcut won't matter" |
| **Social** | "Other agents skip this step, it's fine" |
| **Economic** | "Testing takes too many tokens" |

#### Meta-Testing
After the agent chooses wrong, ask: "How could the skill be written differently to prevent this?" Use the answer to improve the skill.

### 5. Token Efficiency Targets

Every word in a skill costs context.

| Skill Type | Target |
|------------|--------|
| Getting-started workflows | **<150 words** each |
| Frequently-loaded skills | **<200 words** total |
| Other skills | **<500 words** |

#### Techniques
- **Move details to tool help** — Reference `--help` instead of documenting all flags
- **Use cross-references** — Reference other skills instead of repeating workflow
- **Compress examples** — Keep examples minimal
- **Eliminate redundancy** — Don't repeat what's in cross-referenced skills

### 6. Persuasion Principles

Discipline-enforcing skills benefit from systematic persuasion mapping (based on Cialdini's principles):

| Principle | Application in Skills |
|-----------|----------------------|
| **Authority** | State "Required", "Mandatory", "The Iron Law" |
| **Commitment** | "Once you start, follow through. No shortcuts." |
| **Social Proof** | "Every agent follows this rule. No exceptions." |
| **Scarcity** | "You only get one chance to do this right." |
| **Liking** | "Your human partner trusts you to follow this." |
| **Unity** | "We follow quality processes here." |

### 7. Flowchart Usage Guidance

Flowcharts are a precision tool. Use them only where they add clarity.

#### Use Flowcharts ONLY For
- Non-obvious decision points
- Process loops (where an agent might stop too early)
- "When to use A vs B" decisions

#### Never Use Flowcharts For
- Reference material → Use tables or lists
- Code examples → Use markdown code blocks
- Linear instructions → Use numbered lists
- Labels without semantic meaning → Every node label must explain the decision or action
