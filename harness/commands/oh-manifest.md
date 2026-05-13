---
description: Run 7-stage manifest pipeline (clarify → blueprint → build → audit → shield → prove → report)
agent: oh-gater
subtask: true
---

# /oh-manifest — Full-Stack Manifest Pipeline

Runs your feature idea through a 7-stage pipeline from raw concept to ship recommendation.

## Pipeline Stages

| # | Stage | Agent | Focus |
|---|-------|-------|-------|
| 1 | clarify | (self) | Interactive Q&A to refine raw idea into structured spec |
| 2 | blueprint | oh-blueprinter | Produce detailed implementation plan |
| 3 | build | oh-mender | Build the code from the plan |
| 4 | audit | oh-auditor | Review code quality, architecture, DRY |
| 5 | shield | oh-warden | Security vulnerability detection |
| 6 | prove | oh-prover | Test coverage + quality verification |
| 7 | report | (self) | Quality score + ship recommendation |

## Flags

| Flag | Description |
|------|-------------|
| `--stages clarify,blueprint,build` | Run only specific stages |
| `--auto-fix` | Auto-apply mechanical fixes where supported |
| `--skip shield,prove` | Bypass specific stages |
| `--idea "my feature idea"` | Pass idea directly (skips clarify Q&A) |

## Output

The pipeline produces:
- **Quality Score**: 0.0–1.0 overall rating
- **Ship Recommendation**: ship / review / block
- **Per-Stage Results**: status, findings count, score
- **Key Findings**: critical and high severity items
- **Timeline**: duration per stage and total

## Examples

```
/oh-manifest
/oh-manifest --idea "Add a /oh-witness command that runs typecheck, lint, test, build"
/oh-manifest --stages clarify,blueprint --auto-fix
/oh-manifest --skip shield
```
