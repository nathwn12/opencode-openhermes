# Promotion Rules — High-Signal Only

Only high-signal durable items are promoted to curated memory. Routine output stays in transient context or raw receipts.

## Always Promote (Unconditional)

1. **User decisions**: Any explicit user choice that shapes future behavior.
2. **Hard constraints**: Rules with `enforcement: hard` from `source_kind: user|runtime|safety|policy`.
3. **Mistakes with root cause + fix + prevention**: Complete mistake records that include all three resolution fields.
4. **Pre-compact checkpoints**: Any checkpoint written before compaction or context reset.

## Promote After Repetition or Confirmation

1. **Instincts**: After a trigger-action pair succeeds ≥2 times in the same project scope. Promotion state: `project` → after ≥3 additional successes across projects → `candidate_global` → after explicit review → `global`.
2. **Reusable patterns**: After a pattern is observed ≥3 times across different tasks within the same project.
3. **Heuristics inferred from success**: After ≥3 successful applications with measurable improvement.

## Never Auto-Promote

1. Routine task chatter (conversation filler, status updates, "working on it")
2. Ordinary command output (build logs, test output, git status)
3. One-off speculation (unconfirmed theories, "might be X" without evidence)
4. Low-confidence observations (confidence < 0.5, unverified claims)
5. Transient runtime artifacts (temporary files, intermediate outputs)
6. Freeform notes without structured extraction

## Promotion Mechanics

1. **All classes**: Store via `getStore().save(class, id, record)`. SQLite is the durable backend.
2. **Legacy JSON paths**: Old file-per-record at `memory\<class-plural>\<id>.json` and JSONL at `memory\mistakes\mistakes.jsonl` are migration residue, not the primary store.

3. **Instinct promotion path**:
   - `project` → `candidate_global` → `global`
   - Requires explicit review before `candidate_global` → `global`
   - Failure in global scope → downgrade to project scope (not delete)

## Promotion Gates

- **Provenance required**: Every promoted object must have structured provenance. Audit records must include at least one evidence reference.
- **Confidence floor**: Do not auto-promote objects with confidence < 0.3.
- **Duplicate check**: Before promoting, check for existing objects with matching summary + scope. Update existing rather than creating duplicates.
