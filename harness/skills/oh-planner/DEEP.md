# oh-planner — Deep Reference

## Phase 0: Ideation Mode

Use BEFORE brainstorming or planning when the idea is still fuzzy — "I have an idea", "is this worth building", "help me think this through". Two sub-modes based on user's goal.

### Determine Mode

Ask: "What's your goal with this idea?"

| Goal | Mode |
|------|------|
| Building a startup (or thinking about it) | **Startup Mode** |
| Internal project at a company, need to ship fast | **Startup Mode** |
| Hackathon / demo — time-boxed, need to impress | **Builder Mode** |
| Open source / research — building for community | **Builder Mode** |
| Learning / side project / creative outlet | **Builder Mode** |

---

### Startup Mode — The Six Forcing Questions

Ask ONE AT A TIME. Push until the answer is specific, evidence-based, and specific. Comfort means the user hasn't gone deep enough.

**Q1 — Demand Reality:**
"What's the strongest evidence you have that someone actually wants this? Not 'is interested,' not 'signed up for a waitlist' — would be genuinely upset if it disappeared tomorrow?"

Push for: specific behavior (paying, expanding usage, building workflow around it). Red flags: "people say it's interesting," "VCs are excited."

**Q2 — Status Quo:**
"What are your users doing right now to solve this problem — even badly? What does that workaround cost them?"

Push for: hours spent, dollars wasted, tools duct-taped together. Red flag: "nothing exists" (if truly nothing, the problem likely isn't painful enough).

**Q3 — Desperate Specificity:**
"Name the actual human who needs this most. What's their title? What gets them promoted? What gets them fired?"

Push for: a name, a role, a specific consequence they face. Red flag: category-level answers ("enterprises," "SMBs," "marketing teams").

**Q4 — Narrowest Wedge:**
"What's the smallest version someone would pay real money for this week?"

Push for: one concrete feature, one user, one outcome. Not the platform vision — the entry point.

**Q5 — Observation:**
"What have you seen with your own eyes that convinced you this is real?"

Push for: a specific observation, not market research. Something the user witnessed firsthand about how people behave.

**Q6 — Future-Fit:**
"If this works, does it compound or plateau? Will it unlock further capabilities or is it a one-trick pony?"

Compound ideas get deeper investment. One-trick ponies need faster validation cycles.

**Operating Principles for Startup Mode:**
- Specificity is the only currency. Vague answers get pushed.
- Interest is not demand. Behavior counts. Money counts.
- The user's words beat the founder's pitch. Rewrite copy to match what users actually say.
- The status quo is your real competitor (spreadsheets + Slack), not the other startup.
- Narrow beats wide, early. Wedge first, expand from strength.
- Be direct to the point of discomfort. Your job is diagnosis, not encouragement.
- Every session should produce one concrete action the user should take next.

**Anti-sycophancy:** Never say "that's interesting," "you might want to consider," "that could work." Say what WILL work or WON'T work based on evidence. State what evidence would change your position.

---

### Builder Mode — Design Thinking for Projects

Use for side projects, hackathons, learning, open source, creative work.

**Guiding Principles:**
1. **Delight is the currency** — what makes someone say "whoa"?
2. **Ship something you can show people** — the best version of anything is the one that exists.
3. **The best side projects solve your own problem** — if you're building it for yourself, trust that instinct.

**Process:**
1. **Frame the problem** — What specific itch are you scratching? Who else shares it? What's the simplest version?
2. **Explore wildly** — Generate 3 radically different approaches. No judgment. No filtering yet.
3. **Find the fun** — Which approach would be most exciting to build? Motivation beats methodology for side projects.
4. **Time-box** — Set a concrete stop condition (weekend, 50 hours, until the demo works).
5. **Define done** — What does "shippable" look like for this? A CLI that prints the right output? A page that loads? A script that converts one file?
6. **First step** — What's the one thing you can build in the next 2 hours that proves feasibility?

**Output:** A design doc saved as `~/.local/share/openhermes/plans/<project>/ideation-<timestamp>.md` with the problem framing, chosen approach, time-box, and first step.

## Mode A: Brainstorm (fuzzy idea)

Use when the concept is vague ("what if", "I have an idea") and needs shaping into something concrete.

### Process

Ask these 6 clarifying questions in order:

1. **Who specifically needs this?** — Identify the exact user or stakeholder. Not "developers" but "frontend devs doing state management in React 19".
2. **What do they do today?** — Current workflow, tooling, and pain points. What's the manual/partial solution?
3. **What's the one concrete thing they can't do?** — The single capability gap. If they had one new thing, what would it be?
4. **What's the smallest useful version?** — Minimum scope that delivers real value. Strip everything non-essential.
5. **What signals success?** — Observable, measurable outcomes. Not "better DX" but "setup drops from 15min to 2min".
6. **Does this compound or plateau?** — Will this unlock further improvements (compound) or is it a one-time fix (plateau)? Compound features get deeper investment.

### Output
Structured design doc covering: user definition, current workflow, capability gap, minimum viable scope, success metrics, growth trajectory.

## Mode B: Architecture Analysis (existing codebase)

Use when the codebase feels messy or you need to understand the surface before planning.

### Process
1. **Read domain** — Load `CONTEXT.md` (or equivalent domain doc). Understand the language, concepts, and shared terms before touching code. Domain-blind analysis produces wrong recommendations.
2. **Map the surface** — Identify module boundaries and responsibilities, dependency direction, public API surfaces vs internal implementation, configuration and extension points.
3. **Find deepening opportunities** — Look for duplication, over-coupling, grown-beyond-purpose files, dead code or unused abstractions, inconsistent patterns.
4. **Rank by impact** — For each finding, assess effort, value, dependencies, risk.

### Output
Ranked list of refactoring candidates with effort/value/risk assessment. Each candidate includes: location, problem description, recommended change, and estimated effort.

## Mode C: Structured Plan (non-trivial feature)

Use when requirements exist and need a formal plan document to execute from.

### 1. Scope Challenge
Before writing anything, challenge the scope:
- **What existing code partially solves it?** — Don't build from scratch if 60% exists.
- **Minimum changes?** — What's the smallest diff that ships the feature?
- **Complexity check:** 8+ files changed is a smell. Flag it. Reconsider the approach.
- **Search check:** For each architecture pattern in your approach, search `{framework} {pattern} built-in`. Flag custom solutions where framework built-ins exist.
- **Completeness check:** AI-assisted completeness is 10-100x cheaper than human teams. Default to full coverage, not minimal.
- **Distribution check:** New artifact types may need pipelines (build, test, deploy, publish). Include them.

### 2. Strategy Review
Challenge premises: Is this the right problem to solve? Identify scope decisions explicitly (what's in, what's out, why). Consider 10x alternatives. Who owns the outcome? Who reviews?

### 3. Architecture Review
Analyze: data flow, component boundaries, API surface, state model.

### 4. Edge Case Analysis
Cover: error states, concurrency, failure modes, security.

### 5. Dependency Mapping
Map what blocks what: identify parallelizable work streams, note external dependencies, order phases so nothing blocks on unfinished upstream work.

### 6. Write Plan
Produce a structured artifact with: phases, dependencies, verification steps per phase, and exit criteria.

### 7. Self-Review Checklist
1. **Spec coverage** — Skim each requirement from the original request. Can you point to a task that implements it? List any gaps and add missing tasks.
2. **Placeholder scan** — Search the plan for banned patterns: "TBD", "TODO", "implement later", "handle edge cases", "fill in details". Replace every instance with concrete content.
3. **Type consistency** — Do types, method signatures, and property names match across tasks? A function called `clearLayers()` in Task 3 but `clearFullLayers()` in Task 7 is a bug. Fix cross-references.

Fix any issues inline — no need to re-review, just fix and move on. If a spec requirement has no task, add the task.

## Mode D: Autoplan (existing plan needs full review)

Use when a plan exists and needs comprehensive automated review. Auto-decides 90% of intermediate questions.

### Phase Order
Runs sequentially: **Strategy → Architecture → Design → Engineering → DX**. Each phase must complete before the next begins. No jumping ahead.

### Auto-Resolution Principles
| # | Principle | Meaning |
|---|-----------|---------|
| 1 | **Completeness over cleverness** | Cover more cases. Clever shortcuts miss edge cases. |
| 2 | **Boil the lake** | Fix blast radius, not symptom. If a module is misdesigned, refactor it — don't patch around it. |
| 3 | **Pragmatic over perfect** | Ships today wins. Perfect designs that never ship are worthless. |
| 4 | **DRY but not premature** | Reuse what exists. But don't abstract until the 3rd concrete instance appears. |
| 5 | **Explicit over implicit** | Clear code over magic. Magic is fun to write, terrible to debug. |
| 6 | **Bias toward action** | When in doubt, make progress. Analysis paralysis is a decision too. |

### Never Auto-Decide
- **Premises** — Core assumptions about what to build. These need human judgment.
- **Close calls** — Decisions where both options have strong, valid arguments. Surface for discussion.

## Plan Artifact Format

Every plan written by oh-planner uses this canonical format.

### Storage
Canonical path: `~/.local/share/openhermes/plans/<project>/plan-<nnn>.md`

### Template
```markdown
# PLAN: <project>

Plan ID: <project>/plan-<nnn>
Project: <project>
Status: active | in-progress | blocked | complete | abandoned
Created: <ts> | Updated: <ts>
Project Path: <absolute-path>
Plan Path: <canonical-path>/<project>/plan-<nnn>.md
Objective: <short>

## Current State
— What exists now, what phase we're in.

## Assumptions
— Decisions we're making without full information.

## Tasks
- [ ] Task 1
  - [ ] Subtask 1.1

## Active Task
— What's being worked on right now.

## Subagents
| Agent | Purpose | Status | Findings |

## Completed
— Finished tasks with dates.

## Work Log
— Running log of decisions and progress.

## Blockers
— What's stopping progress.

## Validation
- [ ] Static checks
- [ ] Unit tests
- [ ] Manual verification

## Decisions
— Key decisions and their rationale.

## Notes
— Miscellaneous context.
```

### Task Rules
- **Bite-Sized Granularity** — Each step is one action, 2-5 minutes.
- **No Placeholder Rule** — Banned: TBD, TODO, "implement later", "fill in details", "add appropriate error handling", "add validation", "handle edge cases", "write tests for the above" (without actual test code), "Similar to Task N".
- **Complete Code in Every Step** — If a step changes code, show the complete code inline. Use exact file paths always.
- **Expected Output** — Every test step must include the exact command to run and the expected output.

### Execution Handoff
After saving a plan, offer the user an execution choice:
> **Plan saved. Two execution options:**
> **1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task with two-stage review between tasks for fast iteration.
> **2. Inline Execution** — Execute tasks in this session with batch execution and checkpoints.

### Rules
- **Self-contained** — Tasks, Completed, Subagents, and Work Log live in this one file. No separate `todo.md` or `work-log.md`.
- **Status tracks lifecycle** — Only use: `active`, `in-progress`, `blocked`, `complete`, `abandoned`.
- **Validation lives with the plan** — Each plan defines its own verification criteria.

## Anti-patterns
- Skipping strategy review for complex features (architecture mistakes compound)
- Wrong granularity — too vague to execute or too detailed to read
- Re-opening decided debates ("what if we rewrite in Rust?")
- Perfect > shipped (progress > polish)
- Not flagging taste decisions to user
- Big bang rewrites — plan increments, not overhauls
- Skipping the user-approval gate — implementing before the user has reviewed and approved the design document
- Placeholders in plan tasks (TBD, TODO, "implement later" — makes plan unexecutable)
- Missing expected output in test steps
