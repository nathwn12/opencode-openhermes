---
name: ship-workflow
description: Release pipeline patterns — test, bump, changelog, PR, deploy, verify
origin: OH-Fusion
---

# Ship Workflow Skill

Full release lifecycle: test → version bump → changelog → PR → deploy → health check.

## Release Lifecycle

1. **Test**: Full suite + coverage
2. **Bump**: `npm version patch|minor|major`
3. **Changelog**: Generate from conventional commits since last release
4. **PR**: Open release PR with notes
5. **Merge**: Squash to main
6. **Tag**: `git tag v<version> && git push --tags`
7. **Publish**: `npm publish`
8. **Verify**: Post-deploy health check

## Dry-Run Mode

```bash
# Audit what would happen without changes
npm run ship -- --dry-run
```

## Skip Flags

```bash
# Skip specific stages
npm run ship -- --skip test --skip changelog
```

## Version Bumping

```bash
npm version patch   # bug fixes
npm version minor   # new features
npm version major   # breaking changes
```

## Changelog Generation

```bash
# Generate from git log
git log --oneline $(git describe --tags --abbrev=0)..HEAD
# Format: conventional commit types
```

## Post-Deploy Health Check

- [ ] Application responds 200
- [ ] Database migrations ran
- [ ] Error rate normal
- [ ] Latency within threshold
- [ ] New version in production
