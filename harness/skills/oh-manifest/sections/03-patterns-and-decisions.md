# Loop Patterns

| Pattern | Use | Behavior |
|---------|-----|----------|
| sequential | Normal features | One phase at a time, verify each |
| continuous-pr | Multi-step refactors | Per-phase PRs |
| infinite | Watch mode, CI repair | Continue until stop signal |
| rfc-dag | Complex deps | DAG resolution, parallelize independent branches |

Default: sequential.

# Escalation Triggers

| Trigger | Condition | Action |
|---------|-----------|--------|
| Stall | 2 consecutive zero-progress checkpoints | Pause, report attempts |
| Retry storm | Same error 3+ times | Stop, surface with fixes tried |
| Cost drift | Cumulative changes exceed scope | Pause, show diff |
| Quality regression | Verify scores lower than baseline | Pause, report |

These are not optional. When triggered, loop **must** pause.

# Decision Principles

Auto-resolve: completeness > cleverness, boil the lake, pragmatic > perfect, DRY at 3rd instance, explicit > implicit, bias toward action.

Surface only: premises, dead ends, cross-model disagreement.

**Model selection guidance:**
- Mechanical tasks (isolated, 1-2 files, clear spec) → fast cheap model
- Integration tasks (multi-file, coordination) → standard model
- Architecture/design/review tasks → most capable model
