---
name: oh-health
description: "Code quality health check — runs all project tools, scores 0-10, shows trends"
tier: 2
route:
  pass: surface
  fail: oh-investigate
  blocker: surface
---

# oh-health

Run all available project tools, score 0-10, and surface a composite dashboard with trend history.

## Steps

1. Detect available health tools (typecheck, lint, test runner, dead code, shell lint, framework)
2. Run each detected tool sequentially, capture exit code and output summary
3. Score each category using the weighted table (Type check 22%, Lint 18%, Tests 28%, Dead code 13%, Shell lint 9%, Framework 10%)
4. Build composite score with status bands: 10=CLEAN, 7-9=WARNING, 4-6=NEEDS WORK, 0-3=CRITICAL
5. Persist result to `.opencode/health-history.jsonl`
6. Read last 10 entries and produce trend analysis
7. Surface the dashboard with per-category scores, composite score, and trend

## Routing

| Outcome | Route |
|---------|-------|
| pass | → surface |
| fail | → oh-investigate |
| blocker | → surface |
