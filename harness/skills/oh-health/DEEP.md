# oh-health — Deep Reference

## When to Use

Use when you need a code quality health check. Read-only dashboard — no fixes.

## Verification Discipline

Before making any completion claim based on health results, run the Gate:

1. **IDENTIFY** — What specific command/check proves this claim?
2. **RUN** — Execute the full command fresh
3. **READ** — Full output, exit code, failure count
4. **VERIFY** — Does output confirm the claim?
5. **CLAIM** — Only after verification

No completion claims without fresh verification evidence.

| Claim | Requires | Not Sufficient |
|-------|----------|----------------|
| Tests pass | Test command output: 0 failures | Previous run, "should pass" |
| Linter clean | Linter output: 0 errors | Partial check |
| Build succeeds | Build command: exit 0 | Linter passing |
| All checks pass | Each tool run fresh | Aggregated from memory |

## Scoring Table

| Category | Weight | 10 | 7 | 4 | 0 |
|----------|--------|----|----|----|----|
| Type check | 22% | Clean | <10 err | <50 err | 50+ |
| Lint | 18% | Clean | <5 warn | <20 warn | 20+ |
| Tests | 28% | All pass | >95% | >80% | <=80% |
| Dead code | 13% | Clean | <5 items | <20 items | 20+ |
| Shell lint | 9% | Clean | <5 | 5+ | N/A |
| Framework | 10% | Native | Config override | Manual | Unmanaged |

Skip unavailable → redistribute weight proportionally.

## Dashboard Template

```
Category    Score   Status    Details
Type check  10/10   CLEAN     0 errors
Lint         8/10   WARNING   3 warnings
Tests       10/10   CLEAN     47/47 pass
Dead code    7/10   WARNING   4 unused

COMPOSITE: 9.1 / 10
```

Status: 10=CLEAN, 7-9=WARNING, 4-6=NEEDS WORK, 0-3=CRITICAL.

## History Persistence

Append JSONL to `.opencode/health-history.jsonl`:
```json
{"ts":"...","branch":"main","score":9.1,"typecheck":10,"lint":8,"test":10,"deadcode":7,"duration_s":23}
```

## Trend Analysis

Read last 10 entries. Trend table. Identify declining categories. Rank improvements by impact (weight × score deficit).

## Rules

- Read-only. No fixes. Wrap, don't replace (run project's tools).
- Skipped ≠ failed (tool not installed → redistribute weight).
- Show raw output for failures.
- First run: "No trend data yet."

## Anti-patterns

- Claiming results without re-running checks.
- Aggregating from memory instead of running fresh.
