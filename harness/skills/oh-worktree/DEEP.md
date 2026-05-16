# oh-worktree — Deep Reference

## When to Use

Starting feature work that needs isolation from the current workspace. Ensures work happens in an isolated workspace. Prefers native worktree tools. Falls back to manual git worktrees only when no native tool is available.

**Core principle:** Detect existing isolation first. Use native tools. Fall back to git. Never fight the harness.

**Example:** User says "set up worktree for feature-x." Run detection → create worktree → install deps → verify baseline tests pass. Report ready.

## Phases

### Step 0: Detect Existing Isolation

**Before creating anything, check if you are already in an isolated workspace.**

```bash
GIT_DIR=$(git rev-parse --git-dir 2>/dev/null && cd "$(git rev-parse --git-dir)" && pwd -P)
GIT_COMMON=$(git rev-parse --git-common-dir 2>/dev/null && cd "$(git rev-parse --git-common-dir)" && pwd -P)
BRANCH=$(git branch --show-current)
```

**Submodule guard:** `GIT_DIR != GIT_COMMON` is also true inside git submodules. Before concluding "already in a worktree," verify you are not in a submodule:

```bash
git rev-parse --show-superproject-working-tree 2>/dev/null
```

If this returns a path, you're in a submodule — treat as normal repo.

**If `GIT_DIR != GIT_COMMON` (and not a submodule):** Already in a linked worktree. Skip to Step 3. Do NOT create another worktree.

- On a branch: "Already in isolated workspace at `<path>` on branch `<name>`."
- Detached HEAD: "Already in isolated workspace at `<path>` (detached HEAD, externally managed). Branch creation needed at finish time."

**If `GIT_DIR == GIT_COMMON` (or in a submodule):** Normal repo checkout. Ask for consent before creating a worktree:

> "Would you like me to set up an isolated worktree? It protects your current branch from changes."

Honor any declared preference without asking. If declined, work in place and skip to Step 3.

### Step 1: Create Isolated Workspace

Two mechanisms. Try in order.

#### 1a. Native Worktree Tools (preferred)

If a native worktree tool exists (e.g., `EnterWorktree`, `WorktreeCreate`, a `/worktree` command, or a `--worktree` flag), use it and skip to Step 3. Native tools handle directory placement, branch creation, and cleanup automatically. Using `git worktree add` when a native tool exists creates phantom state the harness cannot see or manage.

Only proceed to Step 1b if no native tool is available.

#### 1b. Git Worktree Fallback

Only if Step 1a does not apply.

##### Directory Selection

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

##### Safety Verification (project-local directories only)

**Must verify directory is ignored before creating worktree:**

```bash
git check-ignore -q .worktrees 2>/dev/null || git check-ignore -q worktrees 2>/dev/null
```

If NOT ignored, add to `.gitignore` and commit the change before proceeding.

Why critical: Prevents accidentally committing worktree contents to the repository. Global directories (`~/.config/opencode/worktrees/`) need no verification.

##### Create the Worktree

```bash
project=$(basename "$(git rev-parse --show-toplevel)")
# project-local: path="$LOCATION/$BRANCH_NAME"
# global: path="~/.config/opencode/worktrees/$project/$BRANCH_NAME"
git worktree add "$path" -b "$BRANCH_NAME"
cd "$path"
```

**Sandbox fallback:** If `git worktree add` fails with a permission error (sandbox denial), report the sandbox blocked worktree creation and work in the current directory instead. Then run setup and baseline tests in place.

### Step 3: Project Setup

Auto-detect and run appropriate setup:

```bash
if [ -f package.json ]; then npm install; fi
if [ -f Cargo.toml ]; then cargo build; fi
if [ -f requirements.txt ]; then pip install -r requirements.txt; fi
if [ -f pyproject.toml ]; then poetry install; fi
if [ -f go.mod ]; then go mod download; fi
```

### Step 4: Verify Clean Baseline

Run tests to ensure workspace starts clean using the project-appropriate command (`npm test` / `cargo test` / `pytest` / `go test ./...`).

- Tests pass: Report ready.
- Tests fail: Report failures, ask whether to proceed or investigate.

#### Report

```
Worktree ready at <full-path>
Tests passing (<N> tests, 0 failures)
Ready to implement <feature-name>
```

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
