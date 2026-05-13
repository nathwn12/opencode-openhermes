# Checkpointing — Mandatory Before Compaction

Write a checkpoint before any meaningful compaction or context reset. The checkpoint bridges volatile working context to durable curated memory.

## When to Checkpoint

- Before any `compress` or context-compressing operation (mandatory)
- Before session end when work is incomplete
- Before context reset or major context shift
- Before delegating a long-running subagent when main context holds unrecoverable state
- When context quality degrades (high noise-to-signal, repeated corrections, tool output bloat)
- When pending next actions are complex and would be expensive to reconstruct

Do NOT checkpoint on a mechanical count (e.g., "every N subagent returns"). Evaluate signal-to-noise and risk-of-loss instead. A section genuinely closed is a better trigger than an arbitrary count.

## What to Capture

Each checkpoint must record:

1. **Mission**: Current task or goal. What are we trying to accomplish?
2. **Current state**: What has been done? What is the current disposition of key files?
3. **Active decisions**: Which `decision-id` records are currently shaping behavior?
4. **Active constraints**: Which `constraint-id` records are currently enforced?
5. **Blockers**: What is preventing progress? Dependencies, unknowns, permissions.
6. **Next actions**: Concrete next steps. What should be done immediately after resume?
7. **Risks**: What could go wrong? Open questions, untested assumptions, fragile state.
8. **Memory objects that must survive compaction**: List of IDs or paths that the next session must load.

## Checkpoint Format

Checkpoint objects follow the schema at `openhermes\schemas\checkpoint.schema.json`.

Minimum checkpoint content:
```json
{
  "id": "checkpoint-YYYYMMDD-short-slug",
  "class": "checkpoint",
  "project": "current-project-name",
  "scope": "session",
  "summary": "Brief description of state",
  "mission": "What we are trying to accomplish",
  "current_state": "What has been done",
  "active_decisions": ["decision-id-1", "decision-id-2"],
  "active_constraints": ["constraint-id-1"],
  "blockers": ["blocker description"],
  "next_actions": ["action 1", "action 2"],
  "risk_notes": ["risk description"],
  "source": "agent",
  "provenance": { ... },
  "created_at": "ISO-8601",
  "status": "active"
}
```

## Compaction Recovery

After compaction or resume:
1. Load the latest valid checkpoint for the current project/session.
2. Retrieve `active_decisions` and `active_constraints` by ID.
3. Retrieve only supporting memory needed for `next_actions`.
4. Do NOT reload full history.

## Storage

Checkpoints are stored in SQLite via `getStore().save("checkpoint", id, record)`. Use `ohc_*` tools for normal reads and writes.

- Legacy file-per-record at `memory\checkpoints\<id>.json` and `memory\checkpoints\index.json` is migration residue, not the primary store.
- Archive old/consumed checkpoints by setting `status: "archived"` rather than moving files.

## Validation

A checkpoint is valid when:
- `mission` is non-empty
- At least one `next_action` is specified
- `created_at` is a valid ISO-8601 timestamp
- Provenance is present (at minimum `session_id`)
