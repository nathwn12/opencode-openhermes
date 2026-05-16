---
name: oh-worktree
description: "Use when starting feature work that needs isolation from the current workspace or before executing implementation plans. Manages workspace isolation via git worktrees."
tier: 3
triggers:
  - "isolate workspace"
  - "worktree"
  - "isolated branch"
  - "separate workspace"
  - "clean workspace"
  - "work in isolation"
  - "git worktree"
  - "isolated environment"
  - "workspace isolation"
  - "sandbox workspace"
  - "feature isolation"
  - "branch isolation"
format: chunked
sections:
  01-detection: "Step 0: detect existing isolation, submodule guard, GIT_DIR/GIT_COMMON, consent"
  02-creation: "Step 1: create isolated workspace, native tools, git worktree fallback, safety verification, sandbox fallback"
  03-setup-and-verification: "Step 3: project setup, Step 4: verify clean baseline, report"
  04-reference: "Quick Reference table, Anti-patterns, Red Flags"
route:
  pass: oh-manifest
  fail: surface
  blocker: surface
---

# oh-worktree

Workspace isolation via git worktrees. Ensures work happens in an isolated workspace. Prefers native worktree tools. Falls back to manual git worktrees only when no native tool is available.

**Core principle:** Detect existing isolation first. Use native tools. Fall back to git. Never fight the harness.

**Example:** User says "set up worktree for feature-x." Run detection → create worktree → install deps → verify baseline tests pass. Report ready.

## Sections

| # | Section | Content |
|---|---------|---------|
| 01 | [Detection](sections/01-detection.md) | Step 0: detect existing isolation, submodule guard, GIT_DIR/GIT_COMMON comparison, user consent |
| 02 | [Creation](sections/02-creation.md) | Step 1: native worktree tools (preferred), git worktree fallback, directory selection, safety verification, create + sandbox fallback |
| 03 | [Setup and Verification](sections/03-setup-and-verification.md) | Step 3: auto-detect project setup, Step 4: verify clean baseline tests, report |
| 04 | [Reference](sections/04-reference.md) | Quick Reference table, Anti-patterns, Red Flags |

## Routing

| Outcome | Route |
|---------|-------|
| Workspace ready | → oh-manifest |
| Worktree creation failed | → surface |
| Sandbox blocked worktree | → surface |
| User declined worktree | → surface (work in place) |
| Baseline tests failed | → surface (report + ask) |
| Blocker | → surface |
