---
name: oh-health
description: "Code quality dashboard: runs project tools (typecheck, lint, test, dead code detection), computes weighted composite 0-10 score, persists history, shows trend. Read-only — no fixes."
tier: 2
triggers:
  - "health check"
  - "code quality"
  - "quality dashboard"
  - "how healthy is the codebase"
  - "run all checks"
  - "health"
---

# oh-health

Staff Engineer who owns the CI dashboard. Runs every available project tool, scores results 0-10, computes weighted composite, persists history for trend tracking. Read-only — the user decides what to act on.

## Process

### Step 1: Detect Health Stack
Auto-detect available tools:
- **Type checker** — `tsc --noEmit` (tsconfig.json present), `mypy` (pyproject.toml), or none
- **Linter** — biome, eslint, ruff/pylint, or none
- **Test runner** — from package.json scripts, pytest, cargo test, go test
- **Dead code** — knip, or none
- **Shell lint** — shellcheck for .sh files

Present detected tools. Optionally persist to CLAUDE.md as `## Health Stack` section for future runs.

### Step 2: Run Tools
Run each tool sequentially (some share resources). Capture exit code + output summary for each.

### Step 3: Score Each Category

| Category | Weight | 10 | 7 | 4 | 0 |
|---|---|---|---|---|---|
| Type check | 22% | Clean | <10 errors | <50 errors | 50+ |
| Lint | 18% | Clean | <5 warnings | <20 warnings | 20+ |
| Tests | 28% | All pass | >95% pass | >80% pass | <=80% |
| Dead code | 13% | Clean | <5 unused | <20 unused | 20+ |
| Shell lint | 9% | Clean | <5 issues | 5+ issues | N/A |
| Framework | 10% | Native default | Config override | Manual | Unmanaged |

Skip unavailable categories and redistribute weight proportionally among remaining.

### Step 4: Present Dashboard

```
CODE HEALTH DASHBOARD
═════════════════════
Project: <name>
Branch:  <branch>
Date:    <date>

Category      Score   Status     Details
──────────    ─────   ────────   ───────
Type check    10/10   CLEAN      0 errors
Lint           8/10   WARNING    3 warnings
Tests         10/10   CLEAN      47/47 passed
Dead code      7/10   WARNING    4 unused exports

COMPOSITE: 9.1 / 10
```

Status labels: 10=CLEAN, 7-9=WARNING, 4-6=NEEDS WORK, 0-3=CRITICAL.

### Step 5: Persist History
Append one JSONL line to `.opencode/health-history.jsonl`:
```json
{"ts":"2026-05-14T14:30:00Z","branch":"main","score":9.1,"typecheck":10,"lint":8,"test":10,"deadcode":7,"duration_s":23}
```

### Step 6: Trend Analysis + Recommendations
Read last 10 history entries. Show trend table. For regressions, identify declining categories and specific errors. Rank improvement suggestions by impact (weight × score deficit).

## Rules

- **Read-only.** No fixes. Dashboard and recommendations only.
- **Wrap, don't replace.** Run the project's own tools. Never substitute your own analysis.
- **Skipped is not failed.** Tool not installed → skip gracefully, redistribute weight.
- **Show raw output for failures.** Include tool output so user can act without re-running.
- **Trends require history.** First run: "No trend data yet. Run again after changes to track progress."
