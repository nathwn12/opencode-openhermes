---
description: Health diagnostics, --setup-pm, --model
agent: OpenHermes
subtask: true
---

# Doctor Command

Run full OpenCode openhermes diagnostics. $ARGUMENTS

## Flags

- `--setup-pm` — Configure package manager preference for the project (absorbed from oh-setup-pm)
- `--model` — Recommend model tier by task complexity and budget (absorbed from oh-model)

## Your Task

1. Load the opencode-doctor skill: `skill({ name: "opencode-doctor" })`
2. Follow its instructions to validate:
   - Config syntax (opencode.json valid JSON)
    - Provider connectivity (via OPENCODE_PROVIDER or OpenCode default)
   - Cache state (SQLite memory DB health, recall cache)
    - Auth file integrity
3. Report results with any fix suggestions

## Automated Checks

Run these commands and report results:

!opencode debug config
!opencode debug info
!opencode debug paths

## Report Format

| Check | Result | Issue |
|-------|--------|-------|
| Config JSON | PASS/FAIL | |
| Provider | PASS/FAIL | |
| Memory DB (SQLite) | PASS/FAIL | |
| Plugins | PASS/FAIL | |
| Skills | PASS/FAIL | |

## SQLite Memory DB Checks

When checking memory health, perform these SQLite-specific checks:

### DB Path & Existence
- Resolve expected DB path: `%USERPROFILE%\.local\share\opencode\openhermes\memory.db` (or `$OPENHERMES_MEMORY_DB` if set)
- Report first-run/no-memory state as WARN (not FAIL) if DB does not exist yet

### Schema Validation
- Verify `memory_records` table exists
- Verify expected columns: id, class, data, summary, status, scope, project, created_at, updated_at, session_id
- Verify expected indexes: idx_mr_class_status, idx_mr_updated, idx_mr_summary

### Record Health
- Report row counts grouped by `class` and `status`
- Count rows where `data` is missing, blank, or invalid JSON
- Optionally validate a bounded sample against matching schemas

### WAL & Journal
- Report WAL/SHM files presence and size (if SQLite is in WAL mode)

### Legacy State
- Report old JSON memory directories (`memory/audits/`, `memory/checkpoints/`, etc.) as migration residue, not primary backend failures

## After Diagnosis

If issues found: propose fixes, wait for approval, apply.
If clean: report "OpenHermes: HEALTHY."
