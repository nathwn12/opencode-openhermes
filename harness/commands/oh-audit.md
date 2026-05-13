---
description: Unified quality and security gate (--security, --quality, --test, --verify, --lang=rust|go)
agent: oh-auditor
subtask: true
---

# Audit Command

Unified quality and security gateway. By default runs code review.

## Flags

- `--security` routes to oh-warden for comprehensive security audit
- `--quality` runs the full pipeline (scope → security → review → quality → report)
- `--test` runs oh-prover for coverage analysis and gap identification
- `--verify` runs verification loop (typecheck, lint, test, build)
- `--lang=rust|go|py|java|kotlin|cpp` routes to language-specific reviewer

## Default Mode (no flags)

1. Run code quality review via oh-auditor
2. Report issues with severity levels
3. Suggest fixes for each issue

## Examples

```
/oh-audit --security
/oh-audit --quality
/oh-audit --test
/oh-audit --verify
/oh-audit --lang=rust
/oh-audit --lang=go
```
