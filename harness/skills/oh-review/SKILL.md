---
name: oh-review
description: "Use when code, design, or PR changes need review before merging. Runs Standards + Spec review in parallel sub-agents. Includes architecture deepening and receiving-review feedback handling."
tier: 3
route:
  pass:
    - oh-gauntlet
    - oh-ship
  fail: oh-builder
  blocker: surface
---

# oh-review

Two-axis review: Standards + Spec, parallel sub-agents. Three modes: Diff Review, Architecture Deepening, Receiving Feedback.

## Steps

1. Pin fixed point — capture `git diff <fixed>...HEAD` and `git log <fixed>..HEAD --oneline`.
2. Find spec and standards sources — issues, user paths, docs, AGENTS.md, ADRs, lint config.
3. Run safety check — SQL injection, trust boundaries, hardcoded secrets. Block immediately if critical.
4. Spawn parallel sub-agents — Standards (cite violations per standard) and Spec (quote requirements). Report independently.
5. Aggregate findings — present under Standards/Spec sections. Do not merge. End with total + worst issue.

## Routing

| Outcome | Route |
|---------|-------|
| pass | → oh-gauntlet or oh-ship |
| fail | → oh-builder |
| blocker | → surface |

## Route evidence

When this skill completes, emit `ROUTE_EVIDENCE:` as a JSON line in the output.
Use this shape:
- `outcome`: pass | fail | blocker
- `target`: prefer `oh-ship` if all checks pass cleanly and everything is verified, prefer `oh-gauntlet` if issues need further testing
- `verification`: "verified" if all checks were run and clean, "unverified" if tests need rerun
- `action`: "done" if complete, "fixable" if issues found and fixable, "blocked" if unrecoverable
- `work`: "ship" if ready, "verify" if needs more testing, "implement" if code changes needed
- `reason`: short explanation
