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
