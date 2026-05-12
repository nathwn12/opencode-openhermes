---
description: Run multi-stage quality pipeline (scope → security → review → quality → report)
agent: pipeline-orchestrator
subtask: true
---

# /gauntlet — Multi-Agent Quality Pipeline

Runs your current work through a sequential pipeline of specialist reviews.

## Pipeline Stages

| # | Stage | Agent | Focus |
|---|-------|-------|-------|
| 1 | scope | code-reviewer | Verify diff matches intent, detect scope drift |
| 2 | security | security-reviewer | OWASP Top 10, injection, XSS, auth, secrets |
| 3 | review | code-reviewer | Code quality, architecture, DRY, edge cases |
| 4 | quality | tdd-guide | Test coverage, lint, dead code |
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
/gauntlet
/gauntlet --stages security
/gauntlet --stages security,review --auto-fix
/gauntlet --skip quality
```
