## Workflow

### Phase 1: Prepare
Check test coverage (thin → write characterization tests). Commit current state. Create feature branch.

### Phase 2: Identify
Find code smell. Understand what code does. Plan smallest fix. If behavior unclear → delegate to oh-investigate.

### Phase 3: Refactor (small steps)
One change → run tests → commit → repeat until smell is gone.

### Phase 4: Verify
All tests pass. Manual smoke test if coverage missing. Performance unchanged or better. Diff shows structural changes only.

### Phase 5: Clean Up
Remove commented-out code, stale imports, dead paths. Update docs only if semantics changed. Final commit.
