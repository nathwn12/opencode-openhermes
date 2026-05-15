---
name: oh-ship
description: "Deploy and PR pipeline — test, bump, changelog, PR, deploy, verify"
tier: 4
triggers:
  - "ship this"
  - "create a PR"
  - "version bump"
  - "publish"
route:
  pass: oh-retro
  fail: oh-expert
  blocker: surface
---

# oh-ship

## When to Use
Code ready to ship. Full release pipeline: test → PR → deploy → verify.

## Workflow
1. **Pre-flight** — run tests, lint, typecheck
2. **Version bump** — read VERSION/package.json, semver bump
3. **Changelog** — generate from commits since last tag. Polish: consistent tense, group by type (features, fixes, breaking)
4. **Commit + push** — release commit with changelog
5. **PR** — create PR with summary, test evidence, deploy plan
6. **Merge** — after CI passes
7. **Deploy** — trigger deploy (platform-specific)
8. **Verify** — canary check, health endpoints, smoke tests
9. **Post-ship docs sync** — cross-reference diff against README, CHANGELOG, ARCHITECTURE.md, CONTRIBUTING.md, TODOS.md. Update to match what shipped.

## Anti-patterns
- Skipping pre-flight ("just a quick fix")
- Version bump without changelog
- Deploy without post-deploy verification
- Not tagging releases

## Routing

| Outcome | Route |
|---------|-------|
| pass | → oh-retro (post-ship review) |
| fail | → oh-expert (diagnose) |
| blocker | → surface |
