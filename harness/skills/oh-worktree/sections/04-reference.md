## Quick Reference

| Situation | Action |
|-----------|--------|
| Already in linked worktree | Skip creation (Step 0) |
| In a submodule | Treat as normal repo (Step 0 guard) |
| Native worktree tool available | Use it (Step 1a) |
| No native tool | Git worktree fallback (Step 1b) |
| `.worktrees/` exists | Use it (verify ignored) |
| `worktrees/` exists | Use it (verify ignored) |
| Both exist | Use `.worktrees/` |
| Neither exists | Check instruction file, then default `.worktrees/` |
| Global path exists | Use it (backward compat) |
| Directory not ignored | Add to .gitignore + commit |
| Permission error on create | Sandbox fallback, work in place |
| Tests fail during baseline | Report failures + ask |
| No package.json/Cargo.toml | Skip dependency install |

## Anti-patterns

- **Fighting the harness:** Using `git worktree add` when the platform already provides isolation. Fix: Step 0 detects existing isolation; Step 1a defers to native tools.
- **Skipping detection:** Creating a nested worktree inside an existing one. Fix: Always run Step 0 before creating anything.
- **Skipping ignore verification:** Worktree contents get tracked, pollute git status. Fix: Always use `git check-ignore` before creating a project-local worktree.
- **Assuming directory location:** Creates inconsistency, violates project conventions. Fix: Follow priority: existing > global legacy > instruction file > default.
- **Proceeding with failing tests:** Cannot distinguish new bugs from pre-existing issues. Fix: Report failures, get explicit permission to proceed.
- **Jumping to git fallback:** Skipping Step 1a and going straight to `git worktree add` when a native tool exists. This is the most common mistake.

## Red Flags

**Never:**
- Create a worktree when Step 0 detects existing isolation
- Use `git worktree add` when a native worktree tool is available
- Skip Step 1a by jumping straight to Step 1b's git commands
- Create a worktree without verifying it is ignored (project-local)
- Skip baseline test verification
- Proceed with failing tests without asking

**Always:**
- Run Step 0 detection first
- Prefer native tools over git fallback
- Follow directory priority: existing > global legacy > instruction file > default
- Verify directory is ignored for project-local paths
- Auto-detect and run project setup
- Verify clean test baseline
