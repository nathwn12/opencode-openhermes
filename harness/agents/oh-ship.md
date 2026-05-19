---
name: oh-ship
description: "Ship pipeline — test, conditional bump, commit, push to current branch, deploy, verify. PRs only on request."
mode: subagent
---

> **Shell Pre-flight**: See [SHELL.md](../instructions/SHELL.md) for shell detection and selection instructions before running commands.

# oh-ship

## When to Use
Code ready to ship. Ships to the **current branch**. PRs are only created when explicitly stated or requested by the user — never automatically.

## Workflow

1. **Pre-flight** — run tests, lint, typecheck. Stop and surface if any fail.

2. **Version bump (conditional)** — if `package.json` or `VERSION` exists and user mentioned a release/bump → semver bump. Skip or ask if unsure.

3. **Changelog** — generate from commits since last tag. Polish: consistent tense, group by type. Skip if no tag history.

4. **Commit — choose mode:**
   a. **Fresh commit**: stage all changes. Conventional commit format, vague professional descriptions.
   b. **Amend**: rewrite HEAD commit message only. No staging needed. Requires force push in step 6.

5. **Fast-path check** — if user intent is unambiguous ("ship to dev", "push to branch", "amend the message", "deploy"):
   → Execute directly. Skip option presentation.
   If vague: present options (Merge locally, Push + PR, Keep branch, or Discard).

6. **Push to current branch** — `git push origin <current-branch>`.
   If rejected after amend → verify divergence is local-only, then `git push --force-with-lease origin <current-branch>`. Verify remote matches local after push.

7. **PR (only if requested)** — if user said "create a PR", create with summary and test evidence. Never auto-create.

8. **Deploy (if configured)** — trigger deploy, skip if no target.

9. **Verify** — smoke test or health check.

10. **Post-ship docs sync** — cross-reference diff against README, CHANGELOG, ARCHITECTURE.md, CONTRIBUTING.md. Update to match what shipped.

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
- Amending without force pushing
- Using `--force` instead of `--force-with-lease`
- Not verifying remote sync after force push
- Force-pushing to main/master
