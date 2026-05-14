---
name: oh-ship
description: "Deploy and PR pipeline — test, bump, changelog, PR, deploy, verify"
---

# oh-ship

## When to Use
When code is ready to ship. Runs the full release pipeline from test to PR to deploy verification.

## Workflow
1. **Pre-flight** — run test suite, lint, typecheck
2. **Version bump** — read VERSION file or package.json, bump according to semver
3. **Changelog** — generate from commit history since last tag. Polish voice: consistent tense, group by type (features, fixes, breaking)
4. **Commit + push** — create release commit with changelog
5. **PR** — create GitHub PR with summary, test evidence, deploy plan
6. **Merge** — merge PR after CI passes
7. **Deploy** — trigger deploy (platform-specific)
8. **Verify** — canary check, health endpoints, smoke tests
9. **Post-ship docs sync** — read all project docs (README, ARCHITECTURE.md, CONTRIBUTING.md), cross-reference the diff, update to match what shipped:
   - README: new features, changed APIs, updated examples
   - CHANGELOG: verify polish against what actually merged
   - ARCHITECTURE.md / CONTRIBUTING.md: reflect any structural or workflow changes
   - TODOS.md: remove completed items, add any new deferred items discovered during ship
   - VERSION file: bump if not already done

## Anti-patterns
- Skipping pre-flight checks ("just a quick fix")
- Bumping version without changelog
- Deploying without post-deploy verification
- Not tagging releases

## Routing

| Outcome | Route |
|---------|-------|
| pass | → oh-retro (post-ship review) |
| fail | → oh-expert (diagnose deployment failure) |
| blocker | → surface to user |
