# Ranking Rules — Metadata-First

Rank memory objects using explicit metadata before text similarity. This ensures deterministic, explainable retrieval order.

## Ranking Order (Apply in Sequence)

1. **Project scope match**
   - Exact project match > partial overlap > global scope > no match
   - Scope `harness` ranks alongside `global` for openhermes-level queries

2. **Active task type match**
   - Tags overlap with current task keywords
   - Summary or context contains task-relevant terms (secondary, after tags)

3. **File or subsystem overlap**
   - `refs` array contains paths matching current workspace files
   - Provenance `file_refs` overlap with current working set

4. **Confidence and success rate**
   - Higher confidence ranks above lower (within same class + scope)
   - For instincts: success_count / (success_count + failure_count) ratio
   - Objects with `confidence < 0.3` deprioritized

5. **Recency**
   - Newer `updated_at` ranks above older (within same confidence tier)
   - Objects not updated in >90 days deprioritized unless explicitly referenced

6. **Provenance strength**
   - Strong (DB ref + file/log ref) > Medium (file or log ref, no DB) > Weak (no direct receipt linkage)
   - Weak provenance objects must never outrank strong provenance objects of same class and scope

7. **Text similarity**
   - Used only as tiebreaker after all metadata filters
   - BM25 or equivalent weighted by tag match > summary match > context match

## Authority Alignment

ranking.md does not define its own authority order. It references the single canonical taxonomy in `rules\precedence.md`.

Ranking sorts objects within each authority level by:
1. Scope match (exact project > partial > global)
2. Task type match (tags overlap with current task)
3. File/subsystem overlap (refs overlap with workspace)
4. Confidence and success rate (higher first)
5. Recency (newer first)
6. Provenance strength (strong > medium > weak)
7. Text similarity (tiebreaker only)

## Tiebreakers

When two objects tie on all metadata filters:
1. Higher `signal` value (critical > high > medium > low)
2. More recent `review_at` (if set)
3. Higher `confidence` score (numeric)
4. Deterministic sort by `id` (lexicographic)

## Deprioritization

Objects are deprioritized (moved below active) when:
- `status` is `superseded` or `archived`
- `decay_at` is overdue and not reaffirmed
- `review_at` is >30 days overdue
- `confidence` has decayed below 0.2
- Object has been flagged as stale by a recent audit
