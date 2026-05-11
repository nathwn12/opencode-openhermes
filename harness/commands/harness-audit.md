---
description: Run a self-evaluation audit of the OpenHermes harness
agent: harness-optimizer
subtask: true
---

# Harness Audit Command

Run a self-evaluation audit of the OpenHermes harness and return a prioritized scorecard.

## Usage

`/harness-audit [scope] [--format text|json] [--root path]`

- `scope` (optional): `repo` (default), `hooks`, `skills`, `commands`, `agents`
- `--format`: output style (`text` default, `json` for automation)
- `--root`: audit a specific path instead of the current working directory

## Self-Evaluation Checklist

Evaluate each category by inspecting the harness files directly. No external script needed.

### 1. Tool Coverage (0-10)
- [ ] Commands exist for all subagent types
- [ ] Each command has correct frontmatter (description, agent, subtask)
- [ ] Agent mapping table is complete and accurate
- [ ] Language-specific agents exist (Go, Rust)
- [ ] All command files are discoverable

### 2. Context Efficiency (0-10)
- [ ] Commands are concise (under 100 lines each)
- [ ] No redundant or overlapping command content
- [ ] Delegation instructions are clear
- [ ] Subagent handoffs minimize context overhead
- [ ] Templates provide structured output formats

### 3. Quality Gates (0-10)
- [ ] verify.md has comprehensive checklist
- [ ] quality-gate.md covers lint/type/build
- [ ] test-coverage.md has meaningful targets
- [ ] eval.md has structured scoring framework
- [ ] checkpoint.md enables state tracking

### 4. Memory Persistence (0-10)
- [ ] Memory tools documented (hm_put/get/list/latest/search)
- [ ] Checkpoint command references memory persistence
- [ ] Mistake/audit logging workflow documented
- [ ] Recall cache strategy defined

### 5. Eval Coverage (0-10)
- [ ] eval.md supports binary/scalar/rubric grading
- [ ] Acceptance criteria framework in place
- [ ] Pass@K metrics for non-deterministic evals
- [ ] Evaluation report format defined

### 6. Security Guardrails (0-10)
- [ ] verify.md includes security checklist items
- [ ] No hardcoded secrets guidance present
- [ ] Input validation guidance included
- [ ] SQL injection / XSS risks addressed

### 7. Cost Efficiency (0-10)
- [ ] model-route.md has budget tiers
- [ ] Model routing heuristic defined
- [ ] Subagent usage reduces main-context tokens
- [ ] Compression workflow documented

## Output Contract

Return:

1. `overall_score` out of `max_score` (70 for `repo`; smaller for scoped audits)
2. Category scores and concrete findings
3. Failed checks with exact file paths
4. Top 3 actions to improve
5. Suggested commands to apply next

## Example Result

```text
Harness Audit (repo): 66/70
- Tool Coverage: 10/10 (10/10 pts)
- Context Efficiency: 9/10 (9/10 pts)
- Quality Gates: 10/10 (10/10 pts)

Top 3 Actions:
1) [Security Guardrails] Add preflight security guard instructions in verify.md.
2) [Tool Coverage] Ensure all subagent types have corresponding command files.
3) [Eval Coverage] Add evaluation templates and examples.
```
