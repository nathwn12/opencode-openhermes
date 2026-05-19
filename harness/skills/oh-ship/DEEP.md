# oh-ship — Deep Reference

## When to Use

Code ready to ship. Ships to the **current branch**. PRs are only created when explicitly stated or requested by the user — never automatically.

## Workflow (Steps 1–4)

### 1. Pre-flight
Run tests, lint, typecheck. If any fail, stop and surface.

### 2. Version bump (conditional)
Check if a version bump is applicable:
- If `package.json` or `VERSION` exists and user mentioned a release/bump → semver bump
- If no version file exists or user didn't request a bump → skip
- If unsure whether to bump → ask the user

### 3. Changelog
Generate from commits since last tag. Polish: consistent tense, group by type (features, fixes, breaking). Skip if no tag history.

### 4. Commit

**Fresh commit (default):**
- Stage all changes: `git add -A`
- Conventional commit: `<type>[scope]: <vague professional description>`
- Multi-line body with bullet points if needed
- Keep description under 72 characters

**Amend (user said "amend", "reword", "change message"):**
- Do NOT stage new changes (this is message-only unless user says otherwise)
- Reuse the working tree: `git commit --amend -m "<new message>"`
- Amending rewrites HEAD — the commit hash changes
- This requires force push in step 6 (non-fast-forward)

## Environment & Options (Steps 5–6)

### 5. Detect Environment
Before proceeding, determine workspace state:

```bash
GIT_DIR=$(cd "$(git rev-parse --git-dir)" 2>/dev/null && pwd -P)
GIT_COMMON=$(cd "$(git rev-parse --git-common-dir)" 2>/dev/null && pwd -P)
```

| State | Type | Options |
|-------|------|---------|
| `GIT_DIR == GIT_COMMON` | Normal repo | Standard 4 |
| `GIT_DIR != GIT_COMMON`, named branch | Worktree | Standard 4 |
| `GIT_DIR != GIT_COMMON`, detached HEAD | Externally managed | Reduced 3 |

### 5. Fast-Path Check

Execute without ceremony when user intent is clear:
- "ship to dev" → push to current branch, no options presented
- "push to dev" → push to current branch, no options presented
- "deploy to prod" → push + deploy, no options presented
- "amend the message" → amend + force push, no options presented

Present options when intent is vague:
- "what should I do with this?" → show 4 options
- "ship it" without branch target → ask for confirmation
- Any mention of PR → always ask for PR details regardless

**Ceremony is the enemy of speed. If the user told you what to do, do it.**

### 6. Option Presentation
Core principle: Verify → Detect → Present → Execute → Clean up.

Determine base branch (`git merge-base HEAD main` or `git merge-base HEAD master`). Present structured options based on detected environment.

**Normal repo or named-branch worktree (4 options):**
```
Implementation complete. What would you like to do?
1. Merge into <base> locally
2. Push + create a Pull Request
3. Keep branch as-is
4. Discard this work
Which option?
```

**Detached HEAD — externally managed (3 options):**
```
Implementation complete. Detached HEAD — options:
1. Push as new branch + create a Pull Request
2. Keep as-is
3. Discard this work
Which option?
```

- **Option 1 (Merge):** Checkout base, pull, merge feature branch, verify tests on merged result. Run Provenance-Based Cleanup, then `git branch -d <branch>`. Done. Steps 7–11 are skipped.
- **Option 2 (Push + PR):** Continue to Steps 7–11 (Push, PR, Deploy, Verify, Docs Sync).
- **Option 3 (Keep):** Report "Keeping branch `<name>`." No cleanup. Stop.
- **Option 4 (Discard):** Require typed "discard" confirmation. On confirm, run Provenance-Based Cleanup, then `git branch -D <branch>`. Done.

### 6. Push

**Normal push:**
```bash
git push origin <current-branch>
```

**After amend (non-fast-forward rejection):**
```bash
# 1. Check divergence is local-only (no one else pushed)
git log --oneline origin/<current-branch>..HEAD

# 2. Force push with lease (safest — rejects if remote changed)
git push --force-with-lease origin <current-branch>

# 3. Verify sync
git branch -vv | grep <current-branch>
```

**Safety rules:**
- Only force-push to `dev` or feature branches. NEVER to `main`/`master`.
- `--force-with-lease` is mandatory over `--force` (lease checks remote hasn't changed)
- After force push, verify local and remote are at the same commit

## Push & Deploy (Steps 7–11)

### 7. Push to current branch
`git push origin <current-branch>`. Always the current branch. Never assume a different target.

### 8. PR (only if requested)
If the user explicitly said "create a PR", "open a pull request", or similar → create PR with summary and test evidence. If the change is very large, you may **suggest** a PR, but do not create one without explicit user confirmation.

### 9. Deploy
Trigger deploy (platform-specific). If no deploy target is configured, skip.

### 10. Verify
Smoke test or health check if applicable.

### 11. Post-ship docs sync
Cross-reference diff against README, CHANGELOG, ARCHITECTURE.md, CONTRIBUTING.md. Update to match what shipped.

## Cleanup

### Provenance-Based Cleanup
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

### Correct Ordering
Merge → verify → cleanup → delete branch. Never delete before cleanup — `git branch -d` fails when worktree still references the branch. Always `cd` to main repo root before `git worktree remove`.

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
- Amending without force pushing (push will be rejected)
- Using `--force` instead of `--force-with-lease`
- Staging new changes during a message-only amend
- Not verifying remote sync after force push
- Force-pushing to main/master
