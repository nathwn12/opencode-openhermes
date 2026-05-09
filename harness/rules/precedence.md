# Precedence — Conflict Resolution

When multiple rules, decisions, constraints, or instincts conflict, resolve in this exact order.

## Resolution Order

This is the single canonical authority taxonomy. `ranking.md` sorts within each authority level, not against a separate hierarchy.

| Priority | Source | Scope | Override Rule |
|----------|--------|-------|---------------|
| 1 | Current explicit user instruction | Task/session | Overrides everything below |
| 2 | Safety / legal / destructive-action constraints (hard enforcement) | Global | Only overridable by #1 |
| 3 | Immutable constitution (`openhermes\constitution\`) | Global | Only overridable by #1, #2 |
| 4 | Active project constraints (`enforcement: hard`) | Project | Only overridable by #1-#3 |
| 5 | Current project decisions (`status: active`) | Project | Only overridable by #1-#4 |
| 6 | Verified safety / mistake guards | Project/global | Only overridable by #1-#5 |
| 7 | Active checkpoints | Session/project | Only overridable by #1-#6 |
| 8 | High-confidence instincts (confidence >= 0.5, success_count > failure_count) | Project/global | Only overridable by #1-#7 |
| 9 | Freeform notes / feedstock (`notes\`) | Varies | Lowest authority; supporting evidence only |

## Conflict Detection

A conflict exists when two active items at the same precedence level prescribe incompatible actions.

**Detection triggers**:
- Two active decisions with conflicting `choice` fields
- A constraint blocking an action prescribed by a decision
- An instinct suggesting an action that violates a safety guard
- Two instincts with contradictory `action` fields for the same `trigger`

## Resolution Process

1. **Identify**: Log the conflicting items (IDs, summaries, conflicting fields).
2. **Rank**: Apply the precedence table above.
3. **Resolve**: Higher-precedence item wins. Log resolution as a note or backlog item.
4. **Flag**: If conflict is at the same precedence level (e.g., two active decisions), flag for human review and do not proceed autonomously.
5. **Supersede**: If resolution invalidates a lower-precedence item, mark it `superseded` with a reference to the winning item.

## Cross-Project Conflicts

- Project-scoped items should not conflict across projects by definition (different scope).
- If a global item conflicts with a project item, the global item wins only if it derives from precedence levels 1-3.
- Global instincts and patterns (level 8) defer to project decisions (level 5) when a project has explicitly chosen a different approach.

## Constitution Immutability

The 10 principles in `openhermes\constitution\soul.md` are immutable without:
1. Explicit user approval
2. A full architecture handoff document
3. Verification that the change does not break openhermes integrity

No other rule, decision, or instinct may contradict the constitution. Any attempt to do so is invalid on detection.
