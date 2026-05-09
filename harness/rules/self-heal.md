# Self-Heal — Escalating Tier Model

Self-correction escalates through structured tiers. There is no self-termination. The system recovers by reducing risk, narrowing behavior, and preserving receipts.

## Tier 0 — Observe & Correct

**Trigger**: Any single mistake or unexpected outcome.

**Actions**:
1. Observe the issue — note what happened vs. what was expected.
2. Log a structured mistake record to `memory\mistakes\mistakes.jsonl` with root cause, fix, and prevention.
3. Attempt the smallest safe correction (one-line fix preferred, one-function max).
4. Verify the correction resolved the issue.

**Outcome**: Issue resolved. Mistake logged for future parity checks.

## Tier 1 — Add Prevention

**Trigger**: Same mistake type repeats within 7 days, or correction at T0 failed.

**Actions**:
1. Review the existing mistake record(s) for the type.
2. Add or refine a prevention rule — either a constraint record or a documented guard.
3. Run targeted verification against the original failure scenario.
4. If prevention rule already existed and failed → escalate to T2.

**Outcome**: Prevention rule active. Targeted verification passed.

## Tier 2 — Diagnosis & Review

**Trigger**: Prevention failed, systemic issue suspected, repeated uncertainty, or conflicting constraints.

**Actions**:
1. Delegate to specialist subagent for diagnosis:
   - Build failure → `build-error-resolver`
   - Logic/scope/other → `diagnose` skill + `code-reviewer`
   - Security → `security-reviewer`
    - Config/tool → `openhermes-optimizer` + openhermes audit
2. If structural (affects openhermes behavior across projects), generate a backlog item.
3. Run an openhermes audit to check for broken references, stale constraints, or provenance gaps.
4. Document findings and updated prevention rules.

**Outcome**: Root cause identified. Prevention rules hardened. Backlog item created if structural.

## Tier 3 — Constrained Safe Mode

**Trigger**: Repeated T2 escalation without resolution, or cascading failures across domains.

**Actions**:
1. Enter constrained safe mode:
   - Narrow claims: only claim what is verified.
   - Narrow actions: single-step operations only, no multi-file changes.
   - Preserve receipts: log every action with provenance.
2. Produce a handoff-with-report:
   - What happened (timeline of failures)
   - What was attempted (T0, T1, T2 actions + results)
   - Current state (what works, what doesn't)
   - Recommended next action (human decision required)
   - All mistake records and audit results attached
3. Do NOT continue autonomous work. Wait for human intervention or explicit override.

**Outcome**: Clean handoff state. System preserved. Human can resume without forensic reconstruction.

## Self-Heal Principles

- **Recover by reducing risk**: Narrow scope, add constraints, reduce ambition. Never widen scope to fix a problem.
- **No grandstanding**: Don't re-litigate decisions, don't blame tools, don't produce essay-length explanations. Terse, factual reports.
- **Preserve receipts**: Every tier escalation must be backed by logged evidence (mistake records, audit results, verification outputs).
- **No self-termination**: The session may be paused, constrained, or handed off, but never unilaterally terminated.

## Self-Edit Authority (Repeated for Reference)

| Tier | Allowed |
|------|---------|
| Unconditional | Append memory entries, mistake records, checkpoints, audit receipts |
| Conditional | Patch openhermes docs, schemas, templates, non-core rules; repair stale references in approved openhermes zones |
| Human approval required | Core AGENTS.md changes, model routing, permissions, major config, protected user-owned settings |

Full authority matrix is also in AGENTS.md.
