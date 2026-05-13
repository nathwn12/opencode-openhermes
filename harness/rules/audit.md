# Audit Procedure — Structured OpenHermes Health Check

An openhermes audit evaluates structural integrity, reference health, provenance quality, and drift. Audits produce scored reports backed by explicit evidence refs.

## When to Audit

1. After any openhermes or config changes (files in `openhermes\`, `AGENTS.md`, `opencode.json`, etc.)
2. After repeated failures or notable recovery events (≥2 same-type mistakes in 7 days)
3. On session start when the last recorded openhermes audit is older than 7 days
4. On demand when a structural issue is suspected

## Audit Scope

Each audit targets one or more of:
- `harness` — overall openhermes structure, directory layout, file presence
- `agents` — AGENTS.md compliance, agent routing correctness
- `memory` — memory object integrity, on-disk discoverability, index accuracy, mistake register health
- `refs` — reference integrity (all local file references resolve)
- `migration` — migration state, legacy paths, cutover completeness

## Audit Checks

### Reference Integrity
1. All files referenced in AGENTS.md exist at stated paths.
2. All rule links in AGENTS.md resolve.
3. All schema references in rules resolve.
4. All template references resolve.
5. All archive pointers resolve.
6. No broken internal links in openhermes docs.

### Memory Health
1. All SQLite memory records have valid JSON in their `data` column.
2. No duplicate object IDs exist in any class.
3. All active mistakes have valid JSON structure in SQLite.
4. Mistake register is the SQLite-backed memory store. Legacy JSONL files at `openhermes\memory\mistakes\mistakes.jsonl` are migration residue, not the primary register.

### Provenance Quality
1. All active objects have structured provenance.
2. Audit records contain at least one evidence reference (`db_refs`, `file_refs`, or `log_refs`).
3. No active objects have provenance marked as null or empty.
4. Non-audit objects with weak evidence provenance are flagged.

### Migration State
1. Legacy mistake JSONL paths (`.opencode\mistakes.jsonl`, `openhermes\memory\mistakes\mistakes.jsonl`) contain migration residue only.
2. AGENTS.md does not reference deprecated file paths.

### Structural Integrity
1. SQLite `memory_records` table exists with expected schema.
2. All 9 schema files exist and are valid JSON.
3. All required rule files referenced by `AGENTS.md` exist.
4. Constitution file exists.
5. Archive directories exist.
6. README.md exists.

## Scoring

Each check receives:
- `pass` — check succeeded, no issues
- `warn` — minor issue found, non-blocking
- `fail` — significant issue found, requires attention

`overall_score` = (pass_count / total_checks) * 100

## Audit Output

Audit objects follow the schema at `openhermes\schemas\audit.schema.json`.

Store audit reports via `getStore().save("audit", id, record)`. File-per-record paths are migration residue only.

## Top Actions

After completing all checks, produce a `top_actions` list — highest priority remediations ordered by:
1. Fixing `fail` checks (by severity)
2. Addressing `warn` checks (by proximity to core operations)
3. Structural improvements (non-urgent)

## Post-Audit

1. If `overall_score < 70`, generate backlog items for all `fail` checks.
2. If `integrity.refs_ok == false`, repair references before other work.
3. If `integrity.provenance_ok == false`, flag weak objects for review.
4. If `integrity.duplicates_ok == false`, resolve duplicate IDs.
