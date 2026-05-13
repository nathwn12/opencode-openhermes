---
name: oh-init
description: "Per-repo initialisation — CONTEXT.md, AGENTS.md, docs/adr/ scaffold"
---

# oh-init

## When to Use
When setting up a new project or onboarding an existing repo for agent-assisted development. Run once per repo.

## Workflow
1. **Issue tracker** — detect GitHub issues vs local markdown, configure connection
2. **Triage labels** — create standard labels if missing
3. **Domain docs** — scaffold CONTEXT.md with project name and glossary
4. **ADR directory** — create `docs/adr/` with ADR template
5. **AGENTS.md** — add agent instructions block
6. **Decision record** — save decision: "oh-init completed for project"

## Manual Only
No auto-nudge. User fires this intentionally.

## Anti-patterns
- Running init without understanding the project domain
- Scaffolding CONTEXT.md without populating any terms
- Creating ADR directory but never writing ADRs
