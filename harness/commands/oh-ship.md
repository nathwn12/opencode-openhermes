---
description: Release pipeline — test, bump, changelog, PR, deploy, verify
agent: oh-publisher
subtask: true
---

# Ship Command

End-to-end release pipeline.

## Flags

- `--dry-run` — Audit-only mode, no actual changes

## Pipeline Steps

1. **Test** — Run full test suite
2. **Bump** — Bump version (patch by default, or specify)
3. **Changelog** — Generate changelog from commits
4. **PR** — Create release PR
5. **Deploy** — Publish to registry
6. **Verify** — Verify deployed version

## Examples

```
/oh-ship
/oh-ship --dry-run
```
