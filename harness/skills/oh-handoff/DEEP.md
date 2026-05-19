# oh-handoff — Deep Reference

## When to Use

Session ending, context switch, passing work to another agent, or user says "handoff." Produces a structured document the next session/agent can consume without re-reading the conversation.

## Anti-patterns

- Writing a transcript instead of a structured summary
- Including irrelevant context or raw logs
- Omitting key decisions or blockers
- Over 500 tokens (handoff must be compact)

## Output Template

```markdown
## Goal
<what this session was trying to achieve>

## Progress
### Done
- <completed items>

### In Progress
- <current work>

### Blocked
- <blockers>

## Key Decisions
- <decision> — <rationale>

## Critical Context
<bare essentials the next session MUST know>

## Relevant Files
- <file> — <why it matters>

## Next Steps
- <immediate next action>
```

## Rules

- Keep under 500 tokens if possible
- Only what the next session needs to continue — not a transcript
- Reference plan files by path, don't duplicate content
- If blockers exist, state what's needed to resolve

## Checkpoint Save/Restore

OH can save mid-session checkpoints and restore them in a future session. This is
an extension of oh-handoff: handoff ends a session, checkpoint saves a recoverable
state for resume.

### Save (oh-handoff --save)

Captures current git state, active work, decisions made, and remaining work to the
canonical plan storage directory.

1. **Gather state:**
   - Branch: `git rev-parse --abbrev-ref HEAD`
   - Status: `git status --short` (staged + unstaged files)
   - Diff stat: `git diff --stat`
   - Recent log: `git log --oneline -10`

2. **Summarize context** using conversation history:
   - What's being worked on — the high-level goal
   - Decisions made — architectural choices, trade-offs, rationale
   - Remaining work — concrete next steps, in priority order
   - Notes — gotchas, blockers, open questions, things tried that didn't work

3. **Write checkpoint file** to:
   ```
   ~/.local/share/openhermes/plans/<project>/checkpoints/<timestamp>-<title-slug>.md
   ```

   File format:
   ```markdown
   ---
   status: in-progress
   branch: <branch>
   timestamp: <ISO-8601>
   files_modified:
     - <path>
   ---

   ## Working on: <title>

   ### Summary
   <1-3 sentences describing current progress>

   ### Decisions Made
   - <architectural choices and rationale>

   ### Remaining Work
   1. <next step>
   2. <next step>

   ### Notes
   <gotchas, blockers, open questions>
   ```

4. **Confirm to user:**
   ```
   CHECKPOINT SAVED
   Title:    <title>
   Branch:   <branch>
   File:     <path>
   Modified: N files
   Restore later with oh-handoff --restore.
   ```

### Restore (oh-handoff --restore)

1. **List available checkpoints** (most recent first):
   ```
   CHECKPOINTS for <project>
   #  Date        Title                    Branch
   ─  ──────────  ───────────────────────  ──────────
   1  2026-05-19  auth-refactor            feat/new-auth
   2  2026-05-17  api-pagination           main
   ```

2. **Load most recent** for current branch (default) or specific checkpoint by index.
   Read the checkpoint file. Present:
   - Working on: title
   - Status: summary + decisions
   - Next: remaining work in priority order

3. **Offer options:**
   - A) Resume — continue remaining work
   - B) Read checkpoint file for context only
   - C) List all checkpoints

### List (oh-handoff --list)

Show all checkpoints as a table with status, branch, and timestamp. Support
`--all` (all branches) vs default (current branch only).

### Auto-Save on Handoff

When `oh-handoff` is called normally (session ending), automatically run the save
flow first, then produce the normal handoff document. This ensures no context is
lost even if the user forgets to save.

### Rules

- Checkpoints are append-only — never overwrite. Use timestamp + random suffix for collision safety.
- Titles are sanitized: lowercase, whitespace → hyphens, alphanumeric only.
- Session duration is recorded when available (from session start).
- Restore only reads — never mutates state. The user decides what to resume.
