---
name: oh-context-save
description: "Bookmark session state so it can be resumed later"
---

# oh-context-save

## When to Use
At meaningful boundaries — before switching tasks, ending a session, or when context is running low. Saves git state, decisions, and remaining work.

## Workflow
1. Capture git branch and commit hash
2. Save current task description and progress
3. Save key decisions made this session
4. Save ordered next steps
5. Save to durable storage (memory store checkpoint)

## Output
A saved context entry that can be restored with oh-context-restore.

## Anti-patterns
- Saving every 5 minutes (checkpoint fatigue)
- Saving only git state (omits decisions and context)
- Not saving before context pruning (lost work)
