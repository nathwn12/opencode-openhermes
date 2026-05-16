# Effectiveness and Testing

Advanced patterns for making skills that agents actually follow — not just read. This section covers TDD for skills, Claude Search Optimization, bulletproofing, pressure testing, token efficiency, persuasion principles, and flowchart usage.

---

## 1. TDD for Skills Methodology

**Writing skills IS Test-Driven Development applied to process documentation.**

You write test cases (pressure scenarios), watch them fail (baseline agent behavior), write the skill (the documentation), watch tests pass (agents comply), and refactor (close loopholes).

**Core principle:** If you didn't watch an agent fail without the skill, you don't know if the skill teaches the right thing.

### TDD Mapping

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

### The Iron Law

```
NO SKILL WITHOUT A FAILING TEST FIRST
```

This applies to NEW skills AND EDITS to existing skills.

**No exceptions:**
- Not for "simple additions"
- Not for "just adding a section"
- Not for "documentation updates"
- Don't keep untested changes as "reference"
- Don't "adapt" while running tests
- Delete means delete

### RED Phase — Write Failing Test

Run a pressure scenario with a subagent WITHOUT the skill. Document exact behavior:
- What choices did they make?
- What rationalizations did they use (verbatim)?
- Which pressures triggered violations?

This is "watch the test fail" — you must see what agents naturally do before writing the skill.

### GREEN Phase — Write Minimal Skill

Write a skill that addresses those specific rationalizations. Do not add extra content for hypothetical cases.

Run the same scenario WITH the skill. The agent should now comply.

### REFACTOR Phase — Close Loopholes

Agent found a new rationalization? Add an explicit counter. Re-test until bulletproof.

---

## 2. Claude Search Optimization (CSO)

**Critical for discovery — and for correct behavior.** The description field determines both *whether* a skill is loaded and *how* the agent uses it.

### Description = When to Use, NOT What the Skill Does

**The trap:** When a description summarizes the skill's workflow, Claude may follow the description instead of reading the full skill content. A description saying "code review between tasks" caused Claude to do ONE review, even though the skill's flowchart clearly showed TWO reviews (spec compliance then code quality).

When the description was changed to just "Use when executing implementation plans with independent tasks" (no workflow summary), Claude correctly read the flowchart and followed the two-stage review process.

The skill body becomes documentation Claude skips if the description gives away the process.

### Bad vs. Good Descriptions

```yaml
# ❌ BAD: Summarizes workflow — Claude may follow this instead of reading skill
description: Use when executing plans - dispatches subagent per task with code review between tasks

# ❌ BAD: Too much process detail
description: Use for TDD - write test first, watch it fail, write minimal code, refactor

# ❌ BAD: Too abstract, vague
description: For async testing

# ❌ BAD: First person
description: I can help you with async tests when they're flaky

# ❌ BAD: Mentions technology but skill isn't specific to it
description: Use when tests use setTimeout/sleep and are flaky

# ✅ GOOD: Just triggering conditions, no workflow summary
description: Use when executing implementation plans with independent tasks in the current session

# ✅ GOOD: Triggering conditions only
description: Use when implementing any feature or bugfix, before writing implementation code

# ✅ GOOD: Describes the problem, not language-specific symptoms
description: Use when tests have race conditions, timing dependencies, or pass/fail inconsistently

# ✅ GOOD: Technology-specific skill with explicit trigger
description: Use when using React Router and handling authentication redirects
```

**Rules:**
- Start with "Use when..." to focus on triggering conditions
- Describe the *problem* (race conditions, inconsistent behavior), not *language-specific symptoms* (setTimeout, sleep)
- Keep triggers technology-agnostic unless the skill itself is technology-specific
- Write in third person
- **NEVER summarize the skill's process or workflow**

### Keyword Coverage

Use words Claude would search for:
- **Error messages:** "Hook timed out", "ENOTEMPTY", "race condition"
- **Symptoms:** "flaky", "hanging", "zombie", "pollution"
- **Synonyms:** "timeout/hang/freeze", "cleanup/teardown/afterEach"
- **Tools:** Actual commands, library names, file types

### Descriptive Naming

Use active voice, verb-first:
- ✅ `creating-skills` not `skill-creation`
- ✅ `condition-based-waiting` not `async-test-helpers`
- ✅ `flatten-with-flags` not `data-structure-refactoring`
- ✅ `root-cause-tracing` not `debugging-techniques`

Gerunds (-ing) work well for processes: `creating-skills`, `testing-skills`, `debugging-with-logs`.

---

## 3. Bulletproofing Techniques

Skills that enforce discipline need to resist rationalization. Agents are smart and will find loopholes when under pressure.

### Close Every Loophole Explicitly

Don't just state the rule — forbid specific workarounds:

```markdown
<!-- ❌ Bad -->
Write code before test? Delete it.

<!-- ✅ Good -->
Write code before test? Delete it. Start over.

**No exceptions:**
- Don't keep it as "reference"
- Don't "adapt" it while writing tests
- Don't look at it
- Delete means delete
```

### Address "Spirit vs Letter" Arguments

Add a foundational principle early:

```markdown
**Violating the letter of the rules is violating the spirit of the rules.**
```

This cuts off an entire class of "I'm following the spirit" rationalizations.

### Build Rationalization Table

Capture rationalizations from baseline testing. Every excuse agents make goes in the table:

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

### Create Red Flags List

Make it easy for agents to self-check when rationalizing:

```markdown
## Red Flags — STOP and Start Over

- Code before test
- "I already manually tested it"
- "Tests after achieve the same purpose"
- "It's about spirit not ritual"
- "This is different because..."

**All of these mean: Delete code. Start over with TDD.**
```

### Update Description with Violation Symptoms

Add to the description: symptoms of when you're ABOUT to violate the rule:

```yaml
description: Use when implementing any feature or bugfix, before writing implementation code
```

---

## 4. Pressure Testing Methodology

Different skill types need different test approaches.

### Discipline-Enforcing Skills (rules/requirements)

*Examples: TDD, verification-before-completion, designing-before-coding*

**Test with:**
- Academic questions: Do they understand the rules?
- Pressure scenarios: Do they comply under stress?
- Multiple pressures combined: time + sunk cost + exhaustion
- Identify rationalizations and add explicit counters

**Success criteria:** Agent follows rule under maximum pressure

### Technique Skills (how-to guides)

*Examples: condition-based-waiting, root-cause-tracing, defensive-programming*

**Test with:**
- Application scenarios: Can they apply the technique correctly?
- Variation scenarios: Do they handle edge cases?
- Missing information tests: Do instructions have gaps?

**Success criteria:** Agent successfully applies technique to new scenario

### Pattern Skills (mental models)

*Examples: reducing-complexity, information-hiding concepts*

**Test with:**
- Recognition scenarios: Do they recognize when pattern applies?
- Application scenarios: Can they use the mental model?
- Counter-examples: Do they know when NOT to apply?

**Success criteria:** Agent correctly identifies when/how to apply pattern

### Reference Skills (documentation/APIs)

*Examples: API documentation, command references, library guides*

**Test with:**
- Retrieval scenarios: Can they find the right information?
- Application scenarios: Can they use what they found correctly?
- Gap testing: Are common use cases covered?

**Success criteria:** Agent finds and correctly applies reference information

### Combine 3+ Pressures

For discipline-enforcing skills, combine multiple pressures to find breaking points:

| Pressure Type | Description |
|---------------|-------------|
| **Time** | "This is urgent, just this once skip the rule" |
| **Sunk cost** | "I already wrote the code, starting over wastes work" |
| **Authority** | "The user asked me to do it this way" |
| **Exhaustion** | "After 10 tests, one shortcut won't matter" |
| **Social** | "Other agents skip this step, it's fine" |
| **Economic** | "Testing takes too many tokens" |

Use concrete A/B/C choice scenarios with real file paths so the agent must make an explicit decision.

### Meta-Testing

After the agent chooses wrong, ask: "How could the skill be written differently to prevent this?" Use the answer to improve the skill.

---

## 5. Token Efficiency Targets

Every word in a skill costs context. Getting-started and frequently-referenced skills load into EVERY conversation.

### Word Count Targets

| Skill Type | Target |
|------------|--------|
| Getting-started workflows | **<150 words** each |
| Frequently-loaded skills | **<200 words** total |
| Other skills | **<500 words** |

### Techniques

**Move details to tool help:**
```bash
# ❌ BAD: Document all flags in SKILL.md
search-conversations supports --text, --both, --after DATE, --before DATE, --limit N

# ✅ GOOD: Reference --help
search-conversations supports multiple modes and filters. Run --help for details.
```

**Use cross-references:**
```markdown
# ❌ BAD: Repeat workflow details
When searching, dispatch subagent with template...
[20 lines of repeated instructions]

# ✅ GOOD: Reference other skill
Always use subagents (50-100x context savings). **REQUIRED:** Use [other-skill-name] for workflow.
```

**Compress examples:**
```markdown
# ❌ BAD: Verbose example (42 words)
Your human partner: "How did we handle authentication errors in React Router before?"
You: I'll search past conversations for React Router authentication patterns.
[Dispatch subagent with search query: "React Router authentication error handling 401"]

# ✅ GOOD: Minimal example (20 words)
Partner: "How did we handle auth errors in React Router?"
You: Searching...
[Dispatch subagent → synthesis]
```

**Eliminate redundancy:**
- Don't repeat what's in cross-referenced skills
- Don't explain what's obvious from the command
- Don't include multiple examples of the same pattern

**Cross-referencing other skills:**
- ✅ Good: `**REQUIRED SUB-SKILL:** Use oh-<name>`
- ✅ Good: `**REQUIRED BACKGROUND:** You MUST understand oh-<name>`
- ❌ Bad: `See harness/skills/oh-name/SKILL.md` (unclear if required)
- ❌ Bad: `@harness/skills/oh-name/SKILL.md` (force-loads, burns context)

**Verification:**
```bash
wc -w harness/skills/oh-name/SKILL.md
# getting-started workflows: aim for <150 each
# Other frequently-loaded: aim for <200 total
```

---

## 6. Persuasion Principles

Discipline-enforcing skills benefit from systematic persuasion mapping (based on Cialdini's principles):

| Principle | Application in Skills |
|-----------|----------------------|
| **Authority** | State "Required", "Mandatory", "The Iron Law" — agents respond to explicit mandates |
| **Commitment** | "Once you start, follow through. No shortcuts." — agents honor stated rules |
| **Social Proof** | "Every agent follows this rule. No exceptions." — agents conform to stated norms |
| **Scarcity** | "You only get one chance to do this right." — frames the action as irreplaceable |
| **Liking** | "Your human partner trusts you to follow this." — appeals to relationship |
| **Unity** | "We follow quality processes here." — in-group identity |

Use these deliberately in discipline-enforcing skills to increase compliance under pressure.

---

## 7. Flowchart Usage Guidance

Flowcharts are a precision tool. Use them only where they add clarity, not as decoration.

### Use Flowcharts ONLY For

- **Non-obvious decision points** — where an agent might choose wrong
- **Process loops** — where an agent might stop too early (e.g., "did I verify all criteria or just the first one?")
- **"When to use A vs B"** decisions — comparing approaches where trade-offs are not linear

### Never Use Flowcharts For

- **Reference material** → Use tables or lists instead
- **Code examples** → Use markdown code blocks (copy-pasteable)
- **Linear instructions** → Use numbered lists (simpler, scannable)
- **Labels without semantic meaning** → Every node label must explain the decision or action

### Flowchart Decision Tree

```
Need to show information? → Use markdown (no flowchart)
Need to communicate a non-obvious decision? → Small inline flowchart
Showing a process loop where you might stop too early? → Flowchart
Describing when to use A vs B? → Flowchart
