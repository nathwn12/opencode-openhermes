---
description: Run multi-stage quality pipeline (scope → security → review → quality → report)
agent: oh-gater
subtask: true
---

# /oh-gauntlet — Multi-Agent Quality Pipeline

Runs your current work through a sequential pipeline of specialist reviews.

## Pipeline Stages

| # | Stage | Agent | Focus |
|---|-------|-------|-------|
| 1 | scope | oh-auditor | Verify diff matches intent, detect scope drift |
| 2 | security | oh-warden | OWASP Top 10, injection, XSS, auth, secrets |
| 3 | review | oh-auditor | Code quality, architecture, DRY, edge cases |
| 4 | quality | oh-prover | Test coverage, lint, dead code |
| 5 | report | (self) | Quality score, ship recommendation |

## Flags

| Flag | Description |
|------|-------------|
| `--stages scope,security,review` | Run only specific stages |
| `--auto-fix` | Auto-apply mechanical fixes where supported |
| `--skip review,quality` | Bypass specific stages |

## Output

The pipeline produces:
- **Quality Score**: 0.0–1.0 overall rating
- **Ship Recommendation**: ship / review / block
- **Per-Stage Results**: status, findings count, score
- **Key Findings**: critical and high severity items
- **Timeline**: duration per stage and total

## Examples

```
/oh-gauntlet
/oh-gauntlet --stages security
/oh-gauntlet --stages security,review --auto-fix
/oh-gauntlet --skip quality
```
