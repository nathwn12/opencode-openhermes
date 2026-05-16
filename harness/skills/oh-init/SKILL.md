---
name: oh-init
description: "Sets up AGENTS.md, domain docs, issue tracker, and triage labels"
tier: 2
route:
  pass: done
  fail: oh-init
  blocker: surface
---

# oh-init

Wire AGENTS.md, domain docs, issue tracker, and triage labels for a new OpenHermes project.

## Steps

1. Check existing state (AGENTS.md, opencode.json, plan files, CONTEXT.md, docs/agents/)
2. Create AGENTS.md with OH orchestrator header or append OH section to existing
3. Detect issue tracker platform, confirm with user, write to docs/agents/issue-tracker.md
4. Define triage labels (needs-triage, needs-info, ready-for-agent, ready-for-human, wontfix), write to docs/agents/triage-labels.md
5. Scaffold CONTEXT.md with project name, domain, glossary placeholders; create docs/adr/ with ADR template; write to docs/agents/domain.md
6. Append Agent skills block referencing tracker, triage, and domain docs
7. Record decision artifact

## Routing

| Outcome | Route |
|---------|-------|
| pass | → done |
| fail | → oh-init |
| blocker | → surface |
