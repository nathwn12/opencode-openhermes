---
name: oh-ship
description: "Use when code is ready to ship. Tests, version bump, commit, push to current branch, deploy, and verify. PRs only on request."
tier: 4
route:
  pass: oh-retro
  fail: oh-expert
  blocker: surface
---

# oh-ship

Complete ship pipeline: pre-flight → version → changelog → commit → detect → present → execute.

## Steps

1. Run pre-flight — tests, lint, typecheck. Stop and surface if any fail.
2. Version bump — conditional. If `package.json` or `VERSION` exists and user mentioned release, semver bump. Skip or ask if unsure.
3. Generate changelog — from commits since last tag. Group by type (features, fixes, breaking). Skip if no tag history.
4. Commit — stage all changes. Use conventional commit format with vague professional descriptions.
5. Detect environment — normal repo, worktree, or detached HEAD. Determine base branch.
6. Present structured options — Merge locally, Push + PR, Keep branch, or Discard.
7. Execute chosen option — merge (verify + cleanup + delete), push (push + PR + deploy + verify + docs sync), keep, or discard (require typed confirmation).

## Routing

| Outcome | Route |
|---------|-------|
| pass | → surface (report success) |
| fail | → oh-expert (diagnose) |
| blocker | → surface |
