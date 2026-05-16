# Mode B: Architecture Deepening

Surface refactoring opportunities using the **deletion test**: deleting a shallow module concentrates complexity; a deep module's complexity vanishes.

## Vocabulary
- **Module** — interface + implementation
- **Depth** — leverage at interface (lots of behavior, small interface)
- **Seam** — where interface lives; place to alter behavior without in-place edit
- **Leverage** — what callers get from depth
- **Locality** — change concentrated in one place

## Process
1. **Explore** — Read CONTEXT.md, ADRs. Walk codebase for friction (bouncing between modules, shallow interfaces, deletion test candidates).
2. **Present candidates** — Numbered. Files, problem, solution, locality/leverage benefits. Flag ADR conflicts.
3. **Grilling loop** — Walk design tree. Update CONTEXT.md for new terms. Offer ADRs for rejected candidates.
4. **Output** — Ranked refactoring candidates with collision warnings.
