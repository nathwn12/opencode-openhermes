---
name: oh-guard
description: "Safety confirmation mode — warn before destructive operations"
---

# oh-guard

## When to Use
When touching production, running destructive commands, or working in shared environments. Combines warning prompts with directory-scoped edit locks.

## Workflow
1. **Enable guard mode** — set safety level (careful / freeze / full guard)
2. **Destructive command warnings** — intercept rm -rf, DROP TABLE, force-push, git reset --hard, kubectl delete
3. **Directory scope lock** — restrict file edits to specified directory (freeze)
4. **User override** — user can approve or deny each operation

## Modes
- **Careful** — warn before destructive commands
- **Freeze** — restrict edits to one directory
- **Guard** — both careful + freeze

## Anti-patterns
- Disabling guard because "I know what I'm doing" (narrator: they didn't)
- Running prod commands outside guard mode
- Ignoring warnings about irreversible operations
