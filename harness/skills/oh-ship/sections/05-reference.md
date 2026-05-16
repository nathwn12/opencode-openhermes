# oh-ship — Reference

## Quick Reference

| Option | Merge | Push | Keep Worktree | Cleanup | Delete Branch |
|--------|-------|------|---------------|---------|---------------|
| 1. Merge locally | yes | — | — | yes | yes (`-d`) |
| 2. Push + PR | — | yes | yes | — | — |
| 3. Keep as-is | — | — | yes | — | — |
| 4. Discard | — | — | — | yes | yes (`-D`) |

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
- Deleting branch before removing worktree
- Running `git worktree remove` from inside the worktree
- Cleaning up harness-owned worktrees (provenance check required)
- Discarding work without typed confirmation

## Routing

| Outcome | Route |
|---------|-------|
| pass | → surface (report success) |
| fail | → oh-expert (diagnose) |
| blocker | → surface |
