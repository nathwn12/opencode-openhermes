---
name: oh-init
description: "Initialize project for OpenHermes takeover: scaffold .opencode/ runtime skeleton, wire AGENTS.md, configure domain docs, issue tracker, and triage labels."
tier: 2
triggers:
  - "init project"
  - "setup project"
  - "initialize"
  - "onboard"
  - "scaffold"
  - "takeover"
---

# oh-init

Per-repo setup for OpenHermes-assisted development. Run once per repo. Wires the `.opencode/` runtime skeleton, connects `AGENTS.md` to the orchestrator, then walks through domain/issue configuration decisions one at a time.

Complements OpenCode's built-in `/init` command (which creates `AGENTS.md` with project build/test/architecture notes). Run oh-init after or instead — they serve different layers.

## Process

### Phase 0: Check Existing State
Before writing anything, detect what already exists:

- ☐ `.opencode/` directory present?
- ☐ `.opencode/plan.md` exists?
- ☐ `.opencode/todo.md` exists?
- ☐ `.opencode/work-log.md` exists?
- ☐ `.opencode/instincts.jsonl` exists?
- ☐ `AGENTS.md` exists? (If yes, was it created by OpenCode `/init` or manually?)
- ☐ `opencode.json` / `opencode.jsonc` present?

Report findings. If everything exists, offer to skip or verify and exit.

### Phase 1: .opencode/ Runtime Skeleton
Create `.opencode/` directory if missing. Scaffold shared state files:

**`.opencode/plan.md`** — working plan for the current session. Uses the same format as the global permanent plan directory (`%USERPROFILE%/.config/opencode/task/<project>-plan-<nnn>.md`). When a plan is completed, copy to the global directory with sequenced naming for permanent archive.

```markdown
# PLAN: <project-name>

Plan ID: <project-name>-plan-<nnn>
Project: <project-name>
Status: active
Created: <local-date-time>
Updated: <local-date-time>
Project Path: <absolute-project-path>
Plan Path: .opencode/plan.md
Objective: <short objective>

## Current State

## Assumptions

## Tasks

- [ ] Task 1
  - [ ] Subtask 1.1

## Active Task

## Subagents

| Agent | Purpose | Status | Findings |
|---|---|---|---|

## Completed

## Blockers

- None

## Validation

- [ ] Static checks
- [ ] Formatting checks
- [ ] Type checks
- [ ] Unit tests
- [ ] Integration checks
- [ ] Manual verification

## Decisions

## Notes
```

**`.opencode/todo.md`** — task tracking for multi-step work (start empty).

**`.opencode/work-log.md`** — progress tracking across subagent delegations:
```markdown
# Work Log

## <date> — <description>
- Started: <time>
- Completed: <task>
- Next: <next task>
```

**`.opencode/instincts.jsonl`** — behavioral pattern store for oh-learn (start as empty file). Will grow organically as the agent extracts patterns from sessions.

### Phase 2: AGENTS.md Wiring

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

- Plan first. Write to `.opencode/plan.md` before multi-file changes.
- Verify before claiming success. Read files, run commands, confirm output.
- Delegate substantive work to subagents — main context orchestrates.
- Use oh-* skills on demand. Load via OpenCode's skill tool when relevant.
- Shared state lives in `.opencode/` (plan.md, todo.md, work-log.md, instincts.jsonl).
```

Then ask the user to fill in the Project Context fields. Offer to auto-detect from package manifests.

**If AGENTS.md exists** (e.g., created by OpenCode `/init`):
Append an `## OpenHermes Orchestrator` section to the end:

```markdown
## OpenHermes Orchestrator

OpenHermes is the primary orchestrator for this session.

- **Orchestrator**: OpenHermes — hub-and-spoke routing through oh-* skills
- **Plan**: `.opencode/plan.md` — always check before starting work
- **Shared state**: `.opencode/todo.md`, `.opencode/work-log.md`, `.opencode/instincts.jsonl`
- **Verify before claim**: read files, run commands, confirm output
- **Delegate**: subagents for implementation, main context orchestrates
```

### Phase 3: Issue Tracker
Detect the git hosting platform:
- **GitHub** — `gh` CLI
- **GitLab** — `glab` CLI
- **Local markdown** — files under `.scratch/<feature>/`
- **Other** — freeform workflow description

Confirm with the user. Write the result to `docs/agents/issue-tracker.md`.

### Phase 4: Triage Labels
The `triage` skill uses these label strings to move issues through a state machine:
- `needs-triage` — maintainer needs to evaluate
- `needs-info` — waiting on reporter
- `ready-for-agent` — fully specified, AFK-ready
- `ready-for-human` — needs human implementation
- `wontfix` — will not be actioned

If the repo already has different label names, map them. Write to `docs/agents/triage-labels.md`.

### Phase 5: Domain Docs
Configure how the project organizes domain language:
- **Single-context** — one `CONTEXT.md` + `docs/adr/` at repo root
- **Multi-context** — `CONTEXT-MAP.md` pointing to per-context files

Scaffold `CONTEXT.md` with project name, domain description, and placeholder glossary terms. Create `docs/adr/` directory with ADR template.

Write to `docs/agents/domain.md`.

### Phase 6: Agent Skills Block
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

### Phase 7: Decision Record
Record: "oh-init completed for project <name> on <date>."

## Anti-patterns
- Running init without understanding the project domain
- Scaffolding CONTEXT.md without populating any terms
- Creating ADR directory but never writing ADRs
- Creating both AGENTS.md and CLAUDE.md — edit the one that exists
- Overwriting an existing AGENTS.md created by OpenCode `/init` (append instead)
- Scaffolding `.opencode/` files that already exist (check first, skip duplicates)
- Empty instinct file never getting populated (run oh-learn extract periodically)
- Never archiving completed plans to the global task directory (completed plans rot in `.opencode/` instead of becoming permanent records)

## Routing

| Outcome | Route |
|---------|-------|
| pass | → [done — one-time project setup] |
| fail | → [retry with user corrections] |
| blocker | → surface to user |
