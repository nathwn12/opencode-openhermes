---
description: Session management — save, resume, list, prune
agent: oh-chronicler
subtask: true
---

# Session Command

Cross-session state persistence management.

## Subcommands

- `save <name>` — Save current session state
- `resume <name>` — Resume a saved session
- `list` — List all saved sessions
- `prune <days>` — Remove sessions older than N days

## Examples

```
/oh-session save feature-x
/oh-session resume feature-x
/oh-session list
/oh-session prune 30
```
