# Plan Artifact Format

Every plan written by oh-planner uses this canonical format.

## Storage

Canonical path: `~/.local/share/opencode/openhermes/plans/<project>-plan-<nnn>.md`

## Template

```markdown
# PLAN: <project>

Plan ID: <project>-plan-<nnn>
Project: <project>
Status: active | in-progress | blocked | complete | abandoned
Created: <ts> | Updated: <ts>
Project Path: <absolute-path>
Plan Path: <canonical-path>/<project>-plan-<nnn>.md
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

## Task Notes

Every task in the plan must follow these rules:

### Bite-Sized Granularity
Each step is one action — 2-5 minutes, not "Implement feature" but:
- "Write the failing test" → "Run to confirm fail" → "Write minimal code" → "Run to confirm pass" → "Commit"

### No Placeholder Rule
Banned patterns (plan failures — never write these):
- "TBD", "TODO", "implement later", "fill in details"
- "Add appropriate error handling" / "add validation" / "handle edge cases"
- "Write tests for the above" (without actual test code)
- "Similar to Task N" (repeat the code — the reader may be reading tasks out of order)
- Steps that describe what to do without showing how
- References to types, functions, or methods not defined in any task

### Complete Code in Every Step
If a step changes code, show the complete code inline. Use exact file paths always.

### Expected Output
Every test step must include the exact command to run and the expected output. Example:
```
Run: `pytest tests/path/test.py::test_name -v`
Expected: PASS
```

## Execution Handoff

After saving a plan, offer the user an execution choice:

> **Plan saved. Two execution options:**
>
> **1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task with two-stage review between tasks for fast iteration.
>
> **2. Inline Execution** — Execute tasks in this session with batch execution and checkpoints.
>
> **Which approach?**

If the user chooses Subagent-Driven: dispatch a fresh subagent per task, review results between tasks, continue the loop.

If the user chooses Inline Execution: batch related tasks, run checkpoints at natural boundaries for user review.

## Rules

- **Self-contained** — Tasks, Completed, Subagents, and Work Log live in this one file. No separate `todo.md` or `work-log.md`.
- **Status tracks lifecycle** — Only use: `active`, `in-progress`, `blocked`, `complete`, `abandoned`.
- **Validation lives with the plan** — Each plan defines its own verification criteria.
