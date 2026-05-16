---
name: oh-worktree
description: "Use when starting feature work that needs isolation from the current workspace or before executing implementation plans. Manages workspace isolation via git worktrees."
tier: 3
route:
  pass: oh-manifest
  fail: surface
  blocker: surface
---

# oh-worktree

Create isolated workspaces via git worktrees for safe feature development.

## Steps

1. Detect existing isolation — check if already in a linked worktree
2. Check submodule status to avoid false worktree detection
3. Ask for user consent if not already isolated
4. Prefer native worktree tools over git fallback
5. Select worktree directory following priority: existing > global legacy > instruction file > default
6. Verify directory is git-ignored for project-local paths
7. Auto-detect and run project setup (npm install, cargo build, etc.)
8. Verify clean test baseline and report ready

## Routing

| Outcome | Route |
|---------|-------|
| pass | → oh-manifest |
| fail | → surface |
| blocker | → surface |
