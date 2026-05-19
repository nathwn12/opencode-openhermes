# oh-learn — Deep Reference

## When to Use

When the user asks "what have we learned", "show learnings", "prune stale learnings", or "export learnings". Proactively suggest when the user mentions a recurring pattern or asks "didn't we fix this before?"

## Storage Schema

File: `~/.local/share/openhermes/learnings/<project>/learnings.jsonl`

JSONL format — one JSON object per line:

```jsonl
{"ts":"2026-05-19T10:30:00Z","type":"pattern","key":"golang-nil-slice-range","insight":"range over nil slice in Go is safe (zero iterations). Use range, not nil check.","tags":["go","slices"],"confidence":9,"source":"code-review","branch":"feature/auth"}
{"ts":"2026-05-19T11:00:00Z","type":"anti-pattern","key":"catch-empty-swallow","insight":"Empty catches around file ops cause silent data loss. Use safeUnlink() instead.","tags":["node","error-handling"],"confidence":8,"source":"debug-session","branch":"fix/data-loss"}
{"ts":"2026-05-19T14:00:00Z","type":"decision","key":"use-bun-over-node","insight":"Project uses Bun, not Node. Use Bun APIs (Bun.file, Bun.write) not fs/promises. Check package.json before assuming runtime.","tags":["bun","runtime"],"confidence":10,"source":"setup","branch":"main"}
```

### Field Reference

| Field | Required | Description |
|-------|----------|-------------|
| `ts` | Yes | ISO-8601 timestamp |
| `type` | Yes | `pattern` / `anti-pattern` / `decision` / `insight` |
| `key` | Yes | Short, searchable identifier (kebab-case, 2-5 words) |
| `insight` | Yes | The actionable knowledge (1-3 sentences) |
| `tags` | No | Array of category tags for filtering |
| `confidence` | No | 1-10 scale. 10 = verified fact, 1 = speculation |
| `source` | No | Skill that created this: code-review, debug-session, build, setup, manual |
| `branch` | No | Git branch where this was learned |
| `expires` | No | ISO-8601 date after which this entry should be pruned |

## Operations

### List / Review

Read `learnings.jsonl`, parse each line, display as table:

```
LEARNINGS for <project> (N entries)
#  Date       Type         Key                          Confidence  Tags
─  ─────────  ───────────  ───────────────────────────  ──────────  ───────
1  2026-05-19  pattern      golang-nil-slice-range       9/10        go, slices
2  2026-05-19  anti-pattern catch-empty-swallow          8/10        node, errors
```

Filter flags:
- `--type pattern|anti-pattern|decision|insight` — filter by type
- `--tag <tag>` — filter by tag (can repeat)
- `--since <date>` — only entries after date
- `--confidence <min>` — only entries at or above confidence
- `--all` — show entries from all branches (default: current branch only)

### Record

When the user says something worth remembering:
1. Identify type: is this a pattern (recurring solution), anti-pattern (recurring mistake), decision (architectural choice), or insight (general observation)?
2. Extract the actionable knowledge — what should future sessions do differently?
3. Assign confidence based on evidence level (10 = verified in code, 5 = observed once, 1 = speculation)
4. Tag with relevant categories
5. Append one JSONL line to the file

If the exact `key` already exists for the same branch, append a new entry (don't overwrite — history matters).

### Search

Line-by-line grep across `learnings.jsonl`. Return key, insight snippet, confidence, and date. Group by type.

```
FOUND 3 LEARNINGS matching "<query>"
PATTERNS:
  golang-nil-slice-range (9/10, 2026-05-19): range over nil slice is safe...
ANTI-PATTERNS:
  catch-empty-swallow (8/10, 2026-05-19): Empty catches cause silent data loss...
```

### Prune

Remove entries matching ANY of:
- `expires` date in the past
- `confidence` below user-specified threshold (default: 3)
- Older than N days with confidence < 5 (stale low-confidence entries)
- Explicitly flagged key

Show a diff before/after:
```
PRUNE: 12 → 8 entries (-4)
Removed:
  - stale-hunch (confidence 2, 2026-03-01) — expired
  - old-observation (confidence 4, 2026-01-15) — >90 days below threshold
```

### Export

Produce a markdown report:

```markdown
# Learnings Export: <project>
Exported: <date>
Total: N entries

## Patterns
- **golang-nil-slice-range** (9/10) — range over nil slice in Go is safe...

## Anti-Patterns
- **catch-empty-swallow** (8/10) — empty catches around file ops cause data loss...

## Decisions
- **use-bun-over-node** (10/10) — project uses Bun APIs, not Node...

## Insights
...
```

## Anti-patterns

- Recording without evidence (confidence < 3 without source)
- Overwriting entries instead of appending (history matters)
- Storing in project source control instead of user-local path
- Pruning without showing what was removed
- Search that scans project source code instead of learnings file
