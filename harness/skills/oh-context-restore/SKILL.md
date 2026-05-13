---
name: oh-context-restore
description: "Restore a previously saved session context"
---

# oh-context-restore

## When to Use
After saving context with oh-context-save, to resume work exactly where you left off — even across workspace handoffs.

## Workflow
1. Load most recent saved context
2. Display: branch, commit, task description, progress, decisions, next steps
3. Optionally, specify which saved context to restore (by timestamp or label)
4. Resume working from the saved next steps

## Output
A summary of restored context and the next action to take.

## Anti-patterns
- Restoring stale context (more than a few days old)
- Restoring without verifying git state (branch may have changed)
- Saving but never restoring (why save at all?)
