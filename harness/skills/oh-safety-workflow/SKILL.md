---
name: safety-workflow
description: Safety scoping patterns — careful warnings, freeze directory locks, guard mode
origin: OH-Fusion
---

# Safety Workflow Skill

Protection modes for destructive operations: careful, freeze, guard.

## Mode Overview

| Mode | Effect |
|------|--------|
| careful | Warn before destructive ops (rm, force-push, drop DB) |
| freeze | Block edits to specified directories |
| guard | Both careful + freeze active simultaneously |

## Careful Mode

Activates prompts before:
- `git push --force` or `--force-with-lease`
- `rm -rf`, `del /s`, directory deletion
- Database drop/truncate
- Package unpublish
- Bulk file deletion (> 3 files)

## Freeze Mode

Blocks writes to listed directories. State tracked in `.openhermes-guard.json`:

```json
{
  "freeze_dirs": ["config/", ".env*", "secrets/"],
  "careful": true,
  "guard": false,
  "created_at": "2026-05-13T00:00:00Z"
}
```

## Guard Mode

Both careful + freeze. Prevents any risky operation in locked directories.

## Unfreeze

```bash
# Remove all freeze locks
rm .openhermes-guard.json
```

## Integration

Use before risky operations:
- Before refactoring: freeze source + config
- Before rebase/force-push: enable careful
- Before cleanup scripts: guard mode

File-level tracking checks `.openhermes-guard.json` before every write/delete tool call.
