# oh-guard — Deep Reference

## When to Use

When user says "be careful," "don't break anything," or context involves production, destructive changes, or irreversible actions.

## What Triggers a Guard Check

- File deletion or rename
- Git destructive operations (reset, rebase, force push)
- Dependency changes (add/remove/upgrade)
- Configuration changes affecting auth, network, data
- Any command with `--force`, `-f`, `--hard`, or destructive flags

## Freeze Mode

When the user says "don't touch anything outside [path]" or "only edit files in [dir]," restrict write operations to one allowed directory:

- **Allowed paths**: only the specified directory and its children
- If a write outside the allowed path is required: state the reason and ask before proceeding
- Read operations unrestricted anywhere
- File creation restricted to allowed paths

## Anti-patterns

- Guarding trivial operations (wastes time)
- Forgetting to ask on genuinely destructive operations
- Asking for confirmation on reads or analysis steps
- Editing outside allowed path without asking (freeze mode)
- Reading unrelated files for context and using that to justify edits (freeze mode)
- "Just this one file outside" — ask first (freeze mode)
