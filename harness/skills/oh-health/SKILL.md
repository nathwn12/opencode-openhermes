---
name: oh-health
description: "Use when you need a code quality health check — runs all project tools, scores 0-10, and shows trends. Read-only dashboard — no fixes."
tier: 2
triggers:
  - "health check the codebase"
  - "code quality check"
  - "quality dashboard"
  - "how healthy is the codebase"
  - "run all project checks"
  - "code health"
route:
  pass: surface
  fail: oh-investigate
  blocker: surface
---

# oh-health

Staff Engineer owns the CI dashboard. Runs all available tools, scores 0-10, weighted composite, persists history. Read-only.

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

## Process

### Step 1: Detect Health Stack
Auto-detect: **Type checker** (`tsc --noEmit`, `mypy`), **Linter** (biome, eslint, ruff), **Test runner** (from scripts, pytest, cargo, go), **Dead code** (knip), **Shell lint** (shellcheck). Present detected tools. Optionally persist to CLAUDE.md.

### Step 2: Run Tools
Sequential per tool. Capture exit code + output summary.

### Step 3: Score Each Category

| Category | Weight | 10 | 7 | 4 | 0 |
|----------|--------|----|----|----|----|
| Type check | 22% | Clean | <10 err | <50 err | 50+ |
| Lint | 18% | Clean | <5 warn | <20 warn | 20+ |
| Tests | 28% | All pass | >95% | >80% | <=80% |
| Dead code | 13% | Clean | <5 items | <20 items | 20+ |
| Shell lint | 9% | Clean | <5 | 5+ | N/A |
| Framework | 10% | Native | Config override | Manual | Unmanaged |

Skip unavailable → redistribute weight proportionally.

### Step 4: Dashboard
```
Category    Score   Status    Details
Type check  10/10   CLEAN     0 errors
Lint         8/10   WARNING   3 warnings
Tests       10/10   CLEAN     47/47 pass
Dead code    7/10   WARNING   4 unused

COMPOSITE: 9.1 / 10
```
Status: 10=CLEAN, 7-9=WARNING, 4-6=NEEDS WORK, 0-3=CRITICAL.

### Step 5: Persist History
Append JSONL to `.opencode/health-history.jsonl`:
```json
{"ts":"...","branch":"main","score":9.1,"typecheck":10,"lint":8,"test":10,"deadcode":7,"duration_s":23}
```

### Step 6: Trend Analysis
Read last 10 entries. Trend table. Identify declining categories. Rank improvements by impact (weight × score deficit).

## Rules
- Read-only. No fixes. Wrap, don't replace (run project's tools).
- Skipped ≠ failed (tool not installed → redistribute weight).
- Show raw output for failures.
- First run: "No trend data yet."

## Anti-patterns
- Claiming results without re-running checks.
- Aggregating from memory instead of running fresh.

## Routing

| Outcome | Route |
|---------|-------|
| pass | surface (report score) |
| fail | → oh-investigate (deepen on degraded metrics) |
| blocker | → surface |
