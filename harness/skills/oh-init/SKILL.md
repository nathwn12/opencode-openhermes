---
name: oh-init
description: "Initialize project for agent-assisted development: scaffold CONTEXT.md, AGENTS.md, docs/adr/, configure issue tracker and triage labels."
tier: 2
triggers:
  - "init project"
  - "setup project"
  - "initialize"
  - "onboard"
  - "scaffold"
---

# oh-init

Per-repo setup for agent-assisted development. Run once per repo. Walks through configuration decisions one at a time.

## Process

### 1. Issue Tracker
Detect the git hosting platform:
- **GitHub** — `gh` CLI
- **GitLab** — `glab` CLI
- **Local markdown** — files under `.scratch/<feature>/`
- **Other** — freeform workflow description

Confirm with the user. Write the result to `docs/agents/issue-tracker.md`.

### 2. Triage Labels
The `triage` skill uses these label strings to move issues through a state machine:
- `needs-triage` — maintainer needs to evaluate
- `needs-info` — waiting on reporter
- `ready-for-agent` — fully specified, AFK-ready
- `ready-for-human` — needs human implementation
- `wontfix` — will not be actioned

If the repo already has different label names, map them. Write to `docs/agents/triage-labels.md`.

### 3. Domain Docs
Configure how the project organizes domain language:
- **Single-context** — one `CONTEXT.md` + `docs/adr/` at repo root
- **Multi-context** — `CONTEXT-MAP.md` pointing to per-context files

Scaffold `CONTEXT.md` with project name, domain description, and placeholder glossary terms. Create `docs/adr/` directory with ADR template.

Write to `docs/agents/domain.md`.

### 4. Agent Skills Block
Add a `## Agent skills` section to `AGENTS.md` (or `CLAUDE.md` if it exists):

```markdown
## Agent skills

### Issue tracker
<summary>. See docs/agents/issue-tracker.md.

### Triage labels
<summary>. See docs/agents/triage-labels.md.

### Domain docs
<summary>. See docs/agents/domain.md.
```

### 5. Decision Record
Record: "oh-init completed for project \<name\> on \<date\>."

## Anti-patterns
- Running init without understanding the project domain
- Scaffolding CONTEXT.md without populating any terms
- Creating ADR directory but never writing ADRs
- Creating both AGENTS.md and CLAUDE.md — edit the one that exists

## Routing

| Outcome | Route |
|---------|-------|
| pass | → [done — one-time project setup] |
| fail | → [retry with user corrections] |
| blocker | → surface to user |
