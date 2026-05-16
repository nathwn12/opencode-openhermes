# oh-ship — Workflow (Steps 1–4)

## 1. Pre-flight
Run tests, lint, typecheck. If any fail, stop and surface.

## 2. Version bump (conditional)
Check if a version bump is applicable:
- If `package.json` or `VERSION` exists and user mentioned a release/bump → semver bump
- If no version file exists or user didn't request a bump → skip
- If unsure whether to bump → ask the user

## 3. Changelog
Generate from commits since last tag. Polish: consistent tense, group by type (features, fixes, breaking). Skip if no tag history.

## 4. Commit
Stage all changes. Commit message uses conventional commit format with **vague, professional descriptions** — do not leak implementation details. Use the git-commit skill conventions: `<type>[scope]: <short description>`.
