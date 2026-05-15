# oh-init — Anti-patterns & Routing

## Anti-patterns
- Running without understanding domain
- Empty CONTEXT.md (populate terms)
- ADR dir without ADRs
- Both AGENTS.md and CLAUDE.md (edit the one that exists)
- Overwriting existing AGENTS.md (append)
- Creating .opencode/ dir (plan files go to canonical storage)

## Routing

| Outcome | Route |
|---------|-------|
| pass | done |
| fail | oh-init (retry with corrections) |
| blocker | surface |
