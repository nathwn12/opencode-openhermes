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
3. **Changelog** — generate from commit history since last tag
4. **Commit + push** — create release commit with changelog
5. **PR** — create GitHub PR with summary, test evidence, deploy plan
6. **Merge** — merge PR after CI passes
7. **Deploy** — trigger deploy (platform-specific)
8. **Verify** — canary check, health endpoints, smoke tests

## Anti-patterns
- Skipping pre-flight checks ("just a quick fix")
- Bumping version without changelog
- Deploying without post-deploy verification
- Not tagging releases
