# oh-ship — Cleanup

## Provenance-Based Cleanup

Only runs for Option 1 (Merge) and Option 4 (Discard). Options 2 (Push + PR) and 3 (Keep) always preserve the worktree.

1. **Detect provenance:**
   - `GIT_DIR == GIT_COMMON` → normal repo, no worktree to clean. Done.
   - Worktree path is under `.worktrees/`, `worktrees/`, or similar known paths → we own cleanup.
   - Otherwise → harness-owned workspace. Do NOT remove.

2. **Cleanup (only for owned worktrees):**
   ```bash
   MAIN_ROOT=$(git -C "$(git rev-parse --git-common-dir)/.." rev-parse --show-toplevel)
   cd "$MAIN_ROOT"
   git worktree remove "$WORKTREE_PATH"
   git worktree prune
   ```

3. **Never clean up** harness-owned workspaces. If the platform provides a workspace-exit tool, use it. Otherwise leave in place.

## Correct Ordering

Merge → verify → cleanup → delete branch. Never delete before cleanup — `git branch -d` fails when worktree still references the branch. Always `cd` to main repo root before `git worktree remove`.
