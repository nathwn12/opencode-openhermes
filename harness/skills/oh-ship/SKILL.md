---
name: oh-ship
description: "Ship pipeline — test, conditional bump, commit, push to current branch, deploy, verify. PRs only on request."
tier: 4
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

## When to Use
Code ready to ship. Ships to the **current branch**. PRs are only created when explicitly stated or requested by the user — never automatically.

## Workflow

1. **Pre-flight** — run tests, lint, typecheck. If any fail, stop and surface.

2. **Version bump (conditional)** — check if a version bump is applicable:
   - If `package.json` or `VERSION` exists and user mentioned a release/bump → semver bump
   - If no version file exists or user didn't request a bump → skip
   - If unsure whether to bump → ask the user

3. **Changelog** — generate from commits since last tag. Polish: consistent tense, group by type (features, fixes, breaking). Skip if no tag history.

4. **Commit** — stage all changes. Commit message uses conventional commit format with **vague, professional descriptions** — do not leak implementation details. Use the git-commit skill conventions: `<type>[scope]: <short description>`.

5. **Push to current branch** — `git push origin <current-branch>`. Always the current branch. Never assume a different target.

6. **PR (only if requested)** — if the user explicitly said "create a PR", "open a pull request", or similar → create PR with summary and test evidence. If the change is very large, you may **suggest** a PR, but do not create one without explicit user confirmation.

7. **Deploy** — trigger deploy (platform-specific). If no deploy target is configured, skip.

8. **Verify** — smoke test or health check if applicable.

9. **Post-ship docs sync** — cross-reference diff against README, CHANGELOG, ARCHITECTURE.md, CONTRIBUTING.md. Update to match what shipped.

## Branch Protocol

- **Always push to the current branch.** Detect it with `git branch --show-current`.
- **Always confirm before any branch-sensitive operation.** If the current branch is `main` or `master`, ask: *"Current branch is main. Are you sure? Do you mean a feature/dev branch?"*
- **Never auto-create a PR.** The user must explicitly say "create a PR" or you may suggest one for massive changes, but never execute without confirmation.
- **Never merge.** Merging is the user's decision.

## Branch Confirmation Rules

Before these operations, ALWAYS confirm the branch with the user:
- Pushing to `main` / `master` / `production` — ask "Are you sure? Do you mean a dev branch?"
- Creating a PR — confirm source and target branches
- Deploying — confirm which environment
- Version bump — confirm the bump type (major/minor/patch)

## Anti-patterns
- Skipping pre-flight ("just a quick fix")
- Auto-creating a PR without the user asking
- Pushing to main without confirmation
- Merging without user instruction
- Deploy without post-deploy verification
- Not tagging releases

## Routing

| Outcome | Route |
|---------|-------|
| pass | → oh-retro (post-ship review) |
| fail | → oh-expert (diagnose) |
| blocker | → surface |
