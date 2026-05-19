---
name: oh-learn
description: "Manage project learnings: record, review, search, prune, and export patterns across sessions"
tier: 2
route:
  pass: surface
  fail: surface
  blocker: surface
---

# oh-learn

Persist project learnings (patterns, anti-patterns, decisions) across sessions. Read-only by default — records when asked. Stores in canonical plan storage directory.

## Steps

1. **Load** — Read learning entries from `~/.local/share/openhermes/learnings/<project>/learnings.jsonl`. Report count and recent entries.
2. **Review** — Show recent learnings with timestamps and confidence scores. Filterable by tag, type, or date range.
3. **Record** — When user says "remember this" or states a pattern, append a structured learning entry with: type (pattern/anti-pattern/decision/insight), tags, confidence (1-10), source.
4. **Search** — Query learnings by keyword, tag, or type. Return matches with surrounding context.
5. **Prune** — Remove entries older than N days, below confidence threshold, or explicitly flagged as stale.
6. **Export** — Output learnings as markdown report grouped by type or tag.

## Routing

| Outcome | Route |
|---------|-------|
| pass | → surface |
| fail | → surface |
| blocker | → surface |
