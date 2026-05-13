---
name: pr-workflow
description: Pull request workflow patterns — create, review, merge, PRP lifecycle
origin: OH-Fusion
---

# PR Workflow Skill

Pull request patterns from conventional commits through merge, integrated with the review system.

## PRP Lifecycle

plan → prd → implement → commit → pr → review → merge

1. **Plan**: Scope definition with `ohc_save('backlog', ...)`
2. **PRD**: Structured spec written to project docs
3. **Implement**: One branch per feature
4. **Commit**: Conventional commits for auto-changelog
5. **PR**: `gh pr create` with generated body
6. **Review**: Via subagent, results logged to memory
7. **Merge**: Strategy selection based on branch type

## PR Creation

```bash
gh pr create \
  --title "feat: semantic market search" \
  --body-file .pr-body.md \
  --base main
```

Body template: summary + changes + testing + screenshots.

## PR Review Checklist

- [ ] Code follows project conventions
- [ ] Tests pass with adequate coverage
- [ ] No security vulnerabilities
- [ ] Error handling complete
- [ ] Documentation updated
- [ ] Breaking changes flagged
- [ ] Performance impact assessed

## Merge Strategy Selection

| Branch Type | Strategy |
|-------------|----------|
| feature/* | squash merge |
| fix/* | squash merge |
| release/* | merge commit |
| dependabot/* | squash merge |

## Integration with Review System

- Delegates code review to `code-reviewer` subagent
- Review findings saved to memory store as receipts
- Security review triggered for sensitive changes
