## Step 1: Create Isolated Workspace

Two mechanisms. Try in order.

### 1a. Native Worktree Tools (preferred)

If a native worktree tool exists (e.g., `EnterWorktree`, `WorktreeCreate`, a `/worktree` command, or a `--worktree` flag), use it and skip to Step 3. Native tools handle directory placement, branch creation, and cleanup automatically. Using `git worktree add` when a native tool exists creates phantom state the harness cannot see or manage.

Only proceed to Step 1b if no native tool is available.

### 1b. Git Worktree Fallback

Only if Step 1a does not apply.

#### Directory Selection

Follow this priority. Explicit user preference always beats observed state.

1. Check instructions for a declared worktree directory preference. If specified, use it without asking.
2. Check for an existing project-local worktree directory:
   ```bash
   ls -d .worktrees 2>/dev/null     # Preferred (hidden)
   ls -d worktrees 2>/dev/null      # Alternative
   ```
   If found, use it. If both exist, `.worktrees` wins.
3. Check for an existing global directory:
   ```bash
   project=$(basename "$(git rev-parse --show-toplevel)")
   ls -d ~/.config/opencode/worktrees/$project 2>/dev/null
   ```
   If found, use it (backward compatibility).
4. If no other guidance, default to `.worktrees/` at the project root.

#### Safety Verification (project-local directories only)

**Must verify directory is ignored before creating worktree:**

```bash
git check-ignore -q .worktrees 2>/dev/null || git check-ignore -q worktrees 2>/dev/null
```

If NOT ignored, add to `.gitignore` and commit the change before proceeding.

Why critical: Prevents accidentally committing worktree contents to the repository. Global directories (`~/.config/opencode/worktrees/`) need no verification.

#### Create the Worktree

```bash
project=$(basename "$(git rev-parse --show-toplevel)")
# project-local: path="$LOCATION/$BRANCH_NAME"
# global: path="~/.config/opencode/worktrees/$project/$BRANCH_NAME"
git worktree add "$path" -b "$BRANCH_NAME"
cd "$path"
```

**Sandbox fallback:** If `git worktree add` fails with a permission error (sandbox denial), report the sandbox blocked worktree creation and work in the current directory instead. Then run setup and baseline tests in place.
