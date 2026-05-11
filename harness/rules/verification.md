# Verification — Skeptical Evidence Protocol

Constitutional parent: principle 11 (`openhermes\constitution\soul.md`).
Trust nothing without evidence. Every claim, instruction, document, and behavioral assertion must be confirmed by personal observation or a cached verification receipt before it may be treated as ground truth.

Verification receipts prove that an artifact was observed in a particular state. They do not, by themselves, prove a live runtime claim unless the receipt captures a live-session artifact or log.

## Core Stance

- **User claims** — Input, not truth. Verify against evidence before acting.
- **Document claims** — Documents rot. Cross-reference against current filesystem/code state.
- **Code/script claims** — Past success does not guarantee present function. Run and check.
- **Dependency claims** — Package manifests can be stale. Check the filesystem directly.

## Verification Cache (Memory-Backed)

Successful verifications are stored via `add_memory` so repeated checks of unchanged artifacts are skipped.

### Cache Key

Each verification receipt is keyed by:
- **Artifact identity**: normalized file path, or logical identity (e.g., `state:dcp-installed`)
- **Artifact fingerprint**: file `mtime` + `size` (files), or structured state hash (logical)

### Cache Lifecycle

1. **Before trusting a claim**: search memory (`fetch_memory` or `list_memory`) for matching receipt.
2. **Receipt found + fingerprint matches**: artifact unchanged. Trust cached result. Skip re-verify.
3. **Receipt found + fingerprint differs**: artifact changed. Re-verify. Stale receipt is invalid.
4. **No receipt found**: verify fresh. Store receipt on success.

### Receipt Storage

Use `add_memory` with class `verification_receipt` — a dedicated memory class (schema: `schemas\verification_receipt.schema.json`). Receipts are stored as file-per-object in `memory\verification_receipts\<id>.json`.

Required fields:
- **artifact**: path or logical identity of the verified artifact
- **fingerprint**: { path, mtime, size, sha256? } — determines cache validity
- **environment**: { cwd, os, shell, provider, model } — reproducibility context
- **method**: "command" | "read" | "test" | "schema-validate" | "manual-inspection" | "bash" | "grep"
- **result**: "pass" | "fail" | "unknown"
- **result_detail**: free-text description of what passed/failed, including output excerpts for command-based methods
- **expires_at**: ISO-8601 — hard expiry regardless of fingerprint match (default: 30 days)
- **supersedes / superseded_by**: receipt chains for audit trail

Receipt quality gates:
1. Every receipt must have: `artifact`, `method`, `result`, `result_detail`, `fingerprint`, `environment`, `provenance.session_id`, `created_at`.
2. Command-based receipts (`method: command | bash | test`) must include output excerpt or exit code in `result_detail`.
3. Config-based receipts (`method: manual-inspection | schema-validate | grep`) must reference the specific file paths inspected.
4. No receipt may exceed 30 lines. If more detail is needed, link to a file.
5. Receipts that supersede older ones must set `supersedes` to the prior receipt ID. The older receipt gets `superseded_by`.
6. Receipts without `fingerprint` are non-cacheable — they must be re-verified every time.

Receipts stored under `decision` with `v:` prefix are deprecated. Migrate to `verification_receipt` class on next touch.

## Verification Methods by Artifact

| Artifact | Method | Evidence |
|---|---|---|
| File content | `read` + grep for expected text | Exact match |
| Code behavior | `bash` with test command | Exit 0 + expected output |
| Directory structure | `read` (dir) or `glob` | Entry list matches |
| Installation state | `bash (cmd --version)` | Non-error + expected version |
| Document truth | Cross-ref code/filesystem | Primary source confirms doc |
| User claim | Execute/read referenced thing | Primary evidence matches claim |

## Contradiction Protocol

When verification reveals evidence contradicts a document or user claim:

1. **Pause** — do not proceed on either source.
2. **Log** — `add_memory` as `constraint` or `backlog` with both claim and contradictory evidence.
3. **Flag** — ask user about the discrepancy. Present both sides.
4. **Resolve** — let user decide which source is authoritative. Update document if needed.

## When to Skip Verification

Allowed ONLY when:
- Cached receipt with matching fingerprint exists in memory, AND
- Artifact is confirmed unchanged (same mtime/hash)

Never skip based on "should work" or "user says it works."

## Integration

- **Precedence** (`rules/precedence.md`): verified claim outranks unverified claim at same level. A verification receipt raises the effective priority of the claim it supports.
- **Memory Retrieval** (`rules/retrieval.md`): verification receipts are queried before substantive work (Gate 2) and before task close (Gate 3).
- **Self-Edit** (`AGENTS.md` Self-Edit Authority): adding verification receipts is unconditionally allowed.
