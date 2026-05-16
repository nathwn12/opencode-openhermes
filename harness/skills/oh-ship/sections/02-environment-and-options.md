# oh-ship — Environment & Options (Steps 5–6)

## 5. Detect Environment
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

## 6. Option Presentation
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

> **For detached HEAD:** Only Options 2 (Push + PR), 3 (Keep), and 4 (Discard) are available.
