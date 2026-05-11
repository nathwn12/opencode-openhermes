# Retrieval Policy — Gated & Selective

Never preload full history or full notes into context. Use gated, task-specific retrieval only.

## Retrieval Gates

### Gate 1: On Resume
Load:
- Recent active `decision` records (status: active, updated in last 30 days, current project)
- Active `constraint` records (active: true, relevant scope)
- Latest relevant `checkpoint` (current project or session, most recent)
- Do NOT load full history, full indexes, or freeform notes.

### Gate 2: Before Substantive Work
Query only task-relevant objects:
- Decisions: scope matches project, context/tags overlap task keywords
- Constraints: enforcement == "hard" and relevant, or soft constraints matching task domain
- Instincts: trigger matches current task type, sufficient success_count
- Load only the top-ranked results (limit by metadata-first ranking, not text similarity).

### Gate 3: Before Task Close
Parity check — query:
- Same `type` mistakes in last 7 days (for current project scope)
- Relevant verification rules from active constraints
- If match found → auto-delegate to `code-reviewer` or `security-reviewer` to verify no repeat.

### Gate 4: On Failure / Repeated Uncertainty / Conflict
Query:
- Similar incidents: mistakes with matching tags or failure patterns
- Related decisions that might be stale or conflicting
- Fall back to raw receipts (`opencode.db`) if curated memory is insufficient.
- Search memory BEFORE asking user.

## What to NOT Load

- Full notes directories
- Full log files
- Full historical ledgers
- Entire mistake register (query by type + timeframe only)
- Archived objects (unless explicitly referenced)
- Low-confidence objects below threshold
- Objects with `visibility: implicit` unless materially affecting current behavior

## Memory Anti-Spam Rules

Self-improving agents rot by saving too much. These rules prevent memory spam:

1. **No obvious facts** — never save "npm installs packages", "git tracks changes", etc.
2. **No one-off preferences** — unless repeated across sessions or explicitly marked as durable.
3. **No temporary task state** — transient context (current file, recent command) belongs in session, not durable memory.
4. **No low-risk mistakes** — only create a mistake record when recurrence risk exists (strike>=1).
5. **No unverified promotions** — do not promote an instinct to decision without verification receipt.
6. **Supersede, don't duplicate** — update existing record with `supersedes` field instead of creating new.
7. **Every durable write must have**: `class`, `scope`, `confidence >= 0.3`, `source`, `timestamp`, and either `supersedes` or `status: active`.
8. **Keep receipts lean** — verification receipts should fit in 10-20 lines. Fat receipts indicate poor scoping.

## Retrieval Implementation

1. Start with `latest_memory(class)` for the most likely relevant class.
2. Then use `search_memory(query, classes, project, limit)` with narrow, task-shaped filters.
3. Use `fetch_memory(class, id)` only for specific records surfaced by step 1 or 2.
4. Use `list_memory(class, limit)` only when you need a small class sample or a bounded discovery pass.
5. Never read full memory index files for routine task work.
6. Read whole indexes only when the task is explicitly about auditing, repairing, or regenerating the index itself.
7. For project-level file search with grep/glob patterns: delegate to `explore` subagent.
8. For raw receipts: query `opencode.db` only as forensic fallback (via native read).

## Precision-First Search — MANDATORY

**NEVER start broad. Always needle-precision first.**

1. Start with the single most targeted tool for the question: `grep` for a pattern, `glob` for a filename, `latest_memory` for a memory class, `search_memory` with narrow filters.
2. Read the minimum number of files to answer the question — often 1-3, not 16+.
3. Stop immediately when you have enough signal to answer.
4. Only broaden when every precise method is exhausted and the answer is still missing.
5. A "check" or "inspect" request IS NOT a license to read everything. It means: find the answer with minimal evidence.
6. Reading full indexes, full directories, or unrelated classes without explicit audit/repair scope is forbidden.

## Intelligent Search Guard Rail

- Treat memory indexes as routing metadata, not source documents.
- Stop after the first useful signal if it answers the task.
- If search returns noise, narrow by class, scope, and task keywords before expanding anything.
- Never inspect unrelated memory classes just because they exist.
- Default to the smallest possible evidence set that still supports the decision.

## Priority Order Within Retrieval

When multiple sources return results, rank by:
1. Project scope match (exact > partial > global > none)
2. Recency (newer first within same scope)
3. Provenance strength (strong > medium > weak)
4. Confidence score (higher first)
5. Signal strength (critical > high > medium > low)
