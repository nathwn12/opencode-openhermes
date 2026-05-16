# Mode A: Diff Review

## 1. Pin Fixed Point
User provides branch/commit/tag. Capture `git diff <fixed>...HEAD` + `git log <fixed>..HEAD --oneline`.

## 2. Find Spec Source (order)
1. Issue refs in commit messages (`#123`, `Closes #45`)
2. User-provided path
3. `docs/`, `specs/`, `.scratch/` files
4. Ask user

No spec found → spec sub-agent reports "no spec available."

## 3. Find Standards Sources
AGENTS.md, CLAUDE.md, CONTRIBUTING.md, CONTEXT.md, ADRs, eslint/biome/prettier config (note tool-enforced — don't re-check).

## 4. Spawn Sub-Agents (parallel)
- **Standards** — Read standards + diff. Per-file/hunk: violations citing standard + rule. Distinguish hard violations from judgment calls. Skip tool-enforced.
- **Spec** — Read spec + diff. Report: missing/partial requirements, scope creep, wrong implementations. Quote spec line.

## 5. Aggregate
Present under `## Standards` / `## Spec`. Do not merge. End with total + worst issue.

## Safety Check (inline before spawning)
- SQL injection, LLM trust boundary violations, conditional side effects (test vs prod), hardcoded secrets
- Block immediately if critical — do not spawn sub-agents.
