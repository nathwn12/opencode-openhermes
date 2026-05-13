---
description: Update documentation (--codemap for architecture maps)
agent: oh-scribe
subtask: true
---

# Scribe Command

Update documentation for recent code changes.

## Flags

- `--codemap` — Generate/update architecture codemaps instead of prose docs

## Default Mode (no flags)

1. Scan recent git changes
2. Identify impacted documentation
3. Update docs to reflect changes
4. Verify docs are consistent

## Examples

```
/oh-scribe
/oh-scribe --codemap
```
