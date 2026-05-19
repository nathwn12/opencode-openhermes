---
name: oh-ship
description: "Use when code is ready to ship. Tests, version bump, commit, push to current branch, deploy, and verify. PRs only on request."
tier: 4
route:
  pass:
    - oh-retro
    - oh-docs
  fail: oh-investigate
  blocker: surface
---

# oh-ship

Complete ship pipeline: pre-flight → version → commit → push → verify. Fast-path when intent is clear.

## Steps

1. **Pre-flight** — run tests, lint, typecheck. Stop and surface if any fail.

2. **Version bump (conditional)** — if `package.json` or `VERSION` exists and user mentioned release, semver bump. Skip or ask if unsure.

3. **Generate changelog** — from commits since last tag. Group by type. Skip if no tag history.

4. **Commit** — choose mode:
   a. **Fresh commit**: stage all changes. Conventional commit format, vague professional descriptions.
   b. **Amend**: rewrite HEAD commit message only. No staging needed. Requires force push in step 6.

5. **Fast-path check** — if user intent is unambiguous ("ship to dev", "push to branch", "deploy"):
   → Execute directly. Skip option presentation.
   If intent is vague or user hasn't specified:
   → Present options: Merge locally, Push + PR, Keep branch, or Discard.

6. **Push to current branch** — `git push origin <current-branch>`.
   If rejected (non-fast-forward after amend):
   → Verify divergence is local-only (safety check)
   → `git push --force-with-lease origin <current-branch>`
   → Verify remote matches local after push

7. **PR (only if requested)** — if user said "create a PR", create with summary and test evidence. Never auto-create.

8. **Deploy (if configured)** — trigger deploy, skip if no target.

9. **Verify** — smoke test or health check.

10. **Post-ship docs sync** — cross-reference diff against README, CHANGELOG, ARCHITECTURE.md, CONTRIBUTING.md.

## Routing

| Outcome | Route |
|---------|-------|
| pass | → oh-retro or oh-docs (evidence decides) |
| fail | → oh-investigate (debug ship failure) |
| blocker | → surface |
