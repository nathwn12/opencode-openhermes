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

## Rules

- **Self-contained** — Tasks, Completed, Subagents, and Work Log live in this one file. No separate `todo.md` or `work-log.md`.
- **Status tracks lifecycle** — Only use: `active`, `in-progress`, `blocked`, `complete`, `abandoned`.
- **Validation lives with the plan** — Each plan defines its own verification criteria.
