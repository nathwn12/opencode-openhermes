---
name: oh-init
description: "Initialize project for OpenHermes: wire AGENTS.md, configure domain docs, issue tracker, and triage labels. Does NOT create .opencode/ directory."
tier: 2
triggers:
  - "init this project for oh"
  - "setup project for openhermes"
  - "initialize openhermes setup"
  - "onboard this project"
  - "scaffold project setup"
  - "oh takeover this project"
---

# oh-init

Per-repo setup for OpenHermes-assisted development. Run once per repo. Wires AGENTS.md, configures domain docs, issue tracker, and triage labels. Does NOT create a `.opencode/` directory — plan files go to `~/.local/share/opencode/openhermes/plans/`.

Complements OpenCode's built-in `/init` command (which creates `AGENTS.md` with project build/test/architecture notes). Run oh-init after or instead — they serve different layers.

## Process

### Phase 0: Check Existing State
Before writing anything, detect what already exists:

- ☐ `AGENTS.md` exists? (If yes, was it created by OpenCode `/init` or manually?)
- ☐ `opencode.json` / `opencode.jsonc` present?
- ☐ Canonical plan files (`~/.local/share/opencode/openhermes/plans/<project-name>-plan-*.md`)?
- ☐ `CONTEXT.md` exists?
- ☐ `docs/agents/` directory exists?

Report findings. If everything exists, offer to skip or verify and exit.

### Phase 1: AGENTS.md Wiring

Check if AGENTS.md exists:

**If AGENTS.md does not exist:**
Create it with OpenHermes orchestrator header + prompts for project info:

```markdown
# <project-name>

OpenHermes is the primary orchestrator. All routing, planning, and delegation flows through oh-* skills.

## Project Context

- **Language**: <fill in>
- **Package manager**: <fill in>
- **Build command**: <fill in>
- **Test command**: <fill in>
- **Lint/type check**: <fill in>

## Key Directives

- Plan first. Write to `~/.local/share/opencode/openhermes/plans/<project-name>-plan-<nnn>.md` before multi-file changes.
- **OpenHermes never executes tasks directly. It talks/reports to the user and delegates everything to sub-agents.**
- Verify before claiming success. Read files, run commands, confirm output.
- Never write code, run tests, or edit files in the main context — always delegate.
- Use oh-* skills on demand. Load via OpenCode's skill tool when relevant.
- Plan file is self-contained (Tasks, Completed, Work Log sections).
```

Then ask the user to fill in the Project Context fields. Offer to auto-detect from package manifests.

**If AGENTS.md exists** (e.g., created by OpenCode `/init`):
Append an `## OpenHermes Orchestrator` section to the end:

```markdown
## OpenHermes Orchestrator

OpenHermes is the primary orchestrator for this session.

- **Orchestrator**: OpenHermes — hub-and-spoke routing through oh-* skills
- **Plan**: `~/.local/share/opencode/openhermes/plans/<project-name>-plan-<nnn>.md` — always check before starting work
- **Never execute**: OpenHermes talks/reports to the user and delegates everything to sub-agents
- **Verify before claim**: read files, run commands, confirm output
```

### Phase 2: Issue Tracker
Detect the git hosting platform:
- **GitHub** — `gh` CLI
- **GitLab** — `glab` CLI
- **Local markdown** — files under `.scratch/<feature>/`
- **Other** — freeform workflow description

Confirm with the user. Write the result to `docs/agents/issue-tracker.md`.

### Phase 3: Triage Labels
The `triage` skill uses these label strings to move issues through a state machine:
- `needs-triage` — maintainer needs to evaluate
- `needs-info` — waiting on reporter
- `ready-for-agent` — fully specified, AFK-ready
- `ready-for-human` — needs human implementation
- `wontfix` — will not be actioned

If the repo already has different label names, map them. Write to `docs/agents/triage-labels.md`.

### Phase 4: Domain Docs
Configure how the project organizes domain language:
- **Single-context** — one `CONTEXT.md` + `docs/adr/` at repo root
- **Multi-context** — `CONTEXT-MAP.md` pointing to per-context files

Scaffold `CONTEXT.md` with project name, domain description, and placeholder glossary terms. Create `docs/adr/` directory with ADR template.

Write to `docs/agents/domain.md`.

### Phase 5: Agent Skills Block
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

### Phase 6: Decision Record
Record: "oh-init completed for project <name> on <date>."

## Anti-patterns
- Running init without understanding the project domain
- Scaffolding CONTEXT.md without populating any terms
- Creating ADR directory but never writing ADRs
- Creating both AGENTS.md and CLAUDE.md — edit the one that exists
- Overwriting an existing AGENTS.md created by OpenCode `/init` (append instead)
- Creating `.opencode/` directory — plan files go to OpenCode's canonical storage, not a hidden project dir
- Empty instinct file never getting populated (run oh-learn extract periodically)

## Routing

| Outcome | Route |
|---------|-------|
| pass | → [done — one-time project setup] |
| fail | → [retry with user corrections] |
| blocker | → surface to user |
