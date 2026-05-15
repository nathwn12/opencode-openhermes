---
name: oh-init
description: "Initialize project for OpenHermes: wire AGENTS.md, configure domain docs, issue tracker, and triage labels. Does NOT create .opencode/ directory."
tier: 2
format: chunked
sections:
  01-phase-check-agents: "Phase 0 (check existing state: AGENTS.md, opencode.json, plan files, CONTEXT.md, docs/agents/) and Phase 1 (create AGENTS.md with OH orchestrator header and project context template, or append OpenHermes Orchestrator section)"
  02-phase-issue-tracker-triage: "Phase 2 (detect issue tracker platform via gh/glab/local, confirm with user, write to docs/agents/issue-tracker.md) and Phase 3 (define triage label states: needs-triage, needs-info, ready-for-agent, ready-for-human, wontfix; write to docs/agents/triage-labels.md)"
  03-phase-domain-skills-decision: "Phase 4 (scaffold CONTEXT.md with glossary placeholders, create docs/adr/ with ADR template, write to docs/agents/domain.md), Phase 5 (append Agent skills block to AGENTS.md), and Phase 6 (record decision artifact)"
  04-anti-patterns-routing: "Anti-patterns (running without domain understanding, empty CONTEXT.md, ADR dir without ADRs, CLAUDE.md conflict, overwriting AGENTS.md, creating .opencode/ dir) and pass/fail/blocker routing"
triggers:
  - "init this project for oh"
  - "setup project for openhermes"
  - "initialize openhermes setup"
  - "onboard this project"
  - "scaffold project setup"
  - "oh takeover this project"
route:
  pass: done
  fail: oh-init
  blocker: surface
---

# oh-init

Per-repo OpenHermes setup. Wires AGENTS.md, domain docs, issue tracker, triage labels. One-time. Complements OpenCode's `/init` (run after or instead).

**This skill is chunked.** Read this index, pick the section you need, and `read()` only that section file.

## Section Index

| # | Section | Covers |
|---|---------|--------|
| 1 | [Check State & AGENTS.md](./sections/01-phase-check-agents.md) | Phase 0 (detect existing setup) and Phase 1 (create or append AGENTS.md with OH orchestrator templates) |
| 2 | [Issue Tracker & Triage](./sections/02-phase-issue-tracker-triage.md) | Phase 2 (detect platform, write issue-tracker.md) and Phase 3 (define triage labels, write triage-labels.md) |
| 3 | [Domain, Skills & Decision](./sections/03-phase-domain-skills-decision.md) | Phase 4 (scaffold CONTEXT.md, ADR dir, domain.md), Phase 5 (append skills block), Phase 6 (decision record) |
| 4 | [Anti-patterns & Routing](./sections/04-anti-patterns-routing.md) | Anti-patterns checklist and pass/fail/blocker routing |

## Routing

| Outcome | Route |
|---------|-------|
| pass | done |
| fail | oh-init (retry with corrections) |
| blocker | surface |
