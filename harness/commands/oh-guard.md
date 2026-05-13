---
description: Safety modes — careful (warn), freeze (block edits), guard (both)
agent: OpenHermes
subtask: true
---

# Guard Command

Safety mode management.

## Subcommands

- `careful` — Enable warning mode: confirm before destructive operations
- `freeze <dir>` — Block edits in specified directory
- `unfreeze <dir>` — Unblock edits in specified directory
- `guard` — Enable both careful + freeze for current project

## Examples

```
/oh-guard careful
/oh-guard freeze src/vendor
/oh-guard unfreeze src/vendor
/oh-guard guard
```
