# oh-grill — Deep Reference

## When to Use

Before committing to a plan. "Writing exactly what I asked for and it's still wrong" = design concept not shared. Cheaper in conversation than in code.

**Example:** User shares a plan. The orchestrator loads oh-grill, which spawns 4 parallel lens sub-agents. Each returns a score and concerns. Oh-grill aggregates, computes compound confidence, and either advances to execution or routes back for revision.

## When NOT to Use

- Clear vetted plan needing execution (route directly to oh-builder)
- User needs builder, not critic
- Trivial decisions

## Orchestration Flow

```
Plan artifact → oh-grill
    ├── lens/ceo.md → sub-agent → score + concerns
    ├── lens/eng.md → sub-agent → score + concerns
    ├── lens/design.md → sub-agent → score + concerns
    └── lens/dx.md → sub-agent → score + concerns
    ↓
Aggregate: compound = Σ(weight × score) / Σ(weights)
    ↓
Gate: compound ≥ 8 AND contradictions resolved?
    ├── Yes → ROUTE_EVIDENCE: {confidence, target: "oh-builder"}
    └── No  → ROUTE_EVIDENCE: {confidence, target: "oh-planner", contradictions}
```

### Lens Selection

Not all lenses apply to every plan:
- **Backend-only change** → CEO + Eng only (skip design + DX)
- **UI/UX change** → CEO + Eng + Design + DX (all four)
- **API change** → CEO + Eng + DX (skip design)
- **Infrastructure change** → Eng only

The orchestrator selects lenses based on the plan's "type" hint or by scanning for UI/API/infra keywords.

### ROUTE_EVIDENCE Output

After aggregation, emit a single ROUTE_EVIDENCE line:

```json
ROUTE_EVIDENCE: {"outcome":"pass","confidence":8.4,"target":"oh-builder","verification":"unverified","action":"done","work":"implement","reason":"4/4 lenses passed, compound 8.4/10, 0 unresolved contradictions"}
```

For sub-threshold:
```json
ROUTE_EVIDENCE: {"outcome":"fail","confidence":6.2,"target":"oh-planner","verification":"unverified","action":"fixable","work":"diagnose","reason":"CEO scores 7, Eng scores 5 — architecture concern unresolved"}
```

## Compound Scoring Model

Each lens file has a `weight` in its frontmatter (0.0-1.0). Lenses not selected contribute 0 weight.

```
compound = (ceo.weight × ceo.score +
            eng.weight × eng.score +
            design.weight × design.score +
            dx.weight × dx.score) /
           (ceo.weight + eng.weight + design.weight + dx.weight)
```

Default weights (all 4 lenses active): CEO 0.3, Eng 0.3, Design 0.2, DX 0.2.

## Techniques

- Spawn lens sub-agents in parallel — do NOT run sequentially
- Each lens gets ONLY its own instruction file — no cross-contamination
- Deduplicate concerns before presenting (same concern from different lenses → higher severity)
- Propose recommended resolution per conflicting concern
- One question per branch, resolve before moving on

## Anti-patterns

- Running lenses sequentially instead of in parallel
- Grilling for sake of grilling
- Questions you could answer by reading plan/codebase
- Not distinguishing "must resolve now" vs "figure out later"
- Persisting confidence scores to plan files (they're ephemeral)
