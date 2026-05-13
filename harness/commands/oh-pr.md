---
description: PR workflow — create, review, merge pull requests
agent: oh-merger
subtask: true
---

# PR Command

Pull request workflow management.

## Subcommands

- `create` — Create a pull request with auto-generated summary
- `review <pr-number>` — Review a specific PR
- `merge <pr-number>` — Merge a PR (squash by default)

## Examples

```
/oh-pr create
/oh-pr review 42
/oh-pr merge 42
```
