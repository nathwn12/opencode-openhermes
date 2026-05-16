---
name: oh-ship
description: "Use when code is ready to ship. Tests, version bump, commit, push to current branch, deploy, and verify. PRs only on request."
tier: 4
format: chunked
sections:
  01-workflow: "Steps 1–4 — Pre-flight, Version bump, Changelog, Commit"
  02-environment-and-options: "Steps 5–6 — Detect Environment & Option Presentation"
  03-push-and-deploy: "Steps 7–11 — Push, PR, Deploy, Verify, Docs Sync"
  04-cleanup: "Provenance-Based Cleanup & Correct Ordering"
  05-reference: "Quick Reference, Branch Protocol, Confirmation Rules, Anti-patterns, Routing"
triggers:
  - "ship this"
  - "version bump"
  - "publish"
  - "release"
  - "deploy"
route:
  pass: oh-retro
  fail: oh-expert
  blocker: surface
---

# oh-ship

Complete ship pipeline for code that's ready to ship. Runs pre-flight checks, conditional version bump, changelog generation, and commit. Then detects the workspace environment (normal repo, worktree, or detached HEAD) and presents structured options: merge locally, push + PR, keep, or discard. On push, handles deploy, smoke-test verification, and post-ship docs sync. Includes provenance-based worktree cleanup with correct ordering rules. Ships to the **current branch**. PRs only on explicit request.

**Example:** User says "ship this." Run pre-flight (tests, lint, typecheck) → version bump → changelog → commit → detect environment → present options.

## When to Use
Code ready to ship. Ships to the **current branch**. PRs are only created when explicitly stated or requested by the user — never automatically.

## Sections

| # | Section | Content |
|---|---------|---------|
| 1 | [Workflow](sections/01-workflow.md) | Steps 1–4: Pre-flight, Version bump, Changelog, Commit |
| 2 | [Environment & Options](sections/02-environment-and-options.md) | Steps 5–6: Detect Environment, Option Presentation |
| 3 | [Push & Deploy](sections/03-push-and-deploy.md) | Steps 7–11: Push, PR, Deploy, Verify, Docs Sync |
| 4 | [Cleanup](sections/04-cleanup.md) | Provenance-Based Cleanup, Correct Ordering |
| 5 | [Reference](sections/05-reference.md) | Quick Reference table, Branch Protocol, Confirmation Rules, Anti-patterns, Routing |
