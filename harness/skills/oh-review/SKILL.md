---
name: oh-review
description: "Use when code, design, or PR changes need review before merging. Runs Standards + Spec review in parallel sub-agents. Includes architecture deepening and receiving-review feedback handling."
tier: 3
benefits-from: [oh-expert]
format: chunked
sections:
  01-diff-review: "Mode A: Pin fixed point, find spec sources, spawn parallel Standards + Spec sub-agents, aggregate findings. Includes safety check (SQL injection, trust boundaries, secrets)."
  02-architecture-deepening: "Mode B: Deletion test, vocabulary (module, depth, seam, leverage, locality), 4-step process — explore, present candidates, grilling loop, output"
  03-receiving-feedback: "Mode C: READ→UNDERSTAND→VERIFY→EVALUATE→RESPOND→IMPLEMENT pattern, banned responses, source-specific handling, YAGNI check, push-back guidelines"
  04-reference: "Scoring (safety/structural/style), anti-patterns, routing"
triggers:
  - "code review please"
  - "review the code"
  - "review the PR"
  - "review changes since"
  - "pr review"
  - "design review"
  - "review this code"
  - "address feedback"
  - "review feedback"
  - "respond to review"
route:
  pass:
    - oh-gauntlet
    - oh-ship
  fail: oh-builder
  blocker: surface
---

# oh-review

Two-axis review: Standards + Spec, parallel sub-agents. Three modes: **Diff Review**, **Architecture Deepening**, or **Receiving Review Feedback**.

**Example:** User says "review the PR." Run Mode A — pin the diff, find spec, spawn Standards + Spec sub-agents in parallel, aggregate findings, present total score with worst issue.

**This skill is chunked.** Read this index, pick the section you need, and `read()` only that section file.

## Section Index

| # | Section | Covers |
|---|---------|--------|
| 1 | [Diff Review](./sections/01-diff-review.md) | Pin fixed point, find spec, spawn parallel sub-agents, aggregate, safety check |
| 2 | [Architecture Deepening](./sections/02-architecture-deepening.md) | Deletion test, vocabulary, 4-step process |
| 3 | [Receiving Feedback](./sections/03-receiving-feedback.md) | Feedback handling pattern, banned responses, source-specific handling, YAGNI, push-back |
| 4 | [Reference](./sections/04-reference.md) | Scoring, anti-patterns, routing |
