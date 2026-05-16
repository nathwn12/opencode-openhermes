# oh-guard — Deep Reference

## When to Use

When user says "be careful," "don't break anything," or context involves production, destructive changes, or irreversible actions.

## What Triggers a Guard Check

- File deletion or rename
- Git destructive operations (reset, rebase, force push)
- Dependency changes (add/remove/upgrade)
- Configuration changes affecting auth, network, data
- Any command with `--force`, `-f`, `--hard`, or destructive flags

## Anti-patterns

- Guarding trivial operations (wastes time)
- Forgetting to ask on genuinely destructive operations
- Asking for confirmation on reads or analysis steps
