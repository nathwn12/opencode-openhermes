# oh-init — Deep Reference

## When to Use

Per-repo OpenHermes setup. One-time. Complements OpenCode's `/init` (run after or instead).

## Workflow / Phases

### Phase 0: Check Existing State

Detect: AGENTS.md, opencode.json, plan files, CONTEXT.md, `docs/agents/`. Report findings. All exist → offer skip/verify.

### Phase 1: AGENTS.md

**Not exists:** Create with OH orchestrator header + project context prompts:

```markdown
# <project>

OpenHermes is the primary orchestrator. All routing, planning, and delegation flows through oh-* skills.

## Project Context
- **Language**: <fill or auto-detect>
- **Package manager**: <fill or auto-detect>
- **Build command**: <fill or auto-detect>
- **Test command**: <fill or auto-detect>

## Key Directives
- Plan first. Write to `~/.local/share/opencode/openhermes/plans/<project>/plan-<nnn>.md` before multi-file changes.
- OpenHermes delegates everything to sub-agents — never executes directly.
- Verify before claiming success. Read files, run commands, confirm output.
- Use oh-* skills on demand via the skill tool.
- Plan file is self-contained (Tasks, Completed, Work Log sections).
```

Ask user to fill or auto-detect from manifests.

**Exists:** Append this `## OpenHermes Orchestrator` section:

```markdown
## OpenHermes Orchestrator
OpenHermes is the primary orchestrator.
- **Plan**: `~/.local/share/opencode/openhermes/plans/<project>/plan-<nnn>.md`
- **Never execute**: delegates everything to sub-agents
- **Verify before claim**: read files, run commands, confirm output
```

### Phase 2: Issue Tracker

Detect platform (GitHub → gh, GitLab → glab, local markdown, other). Confirm with user. Write to `docs/agents/issue-tracker.md`.

### Phase 3: Triage Labels

States: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. Map to existing labels. Write to `docs/agents/triage-labels.md`.

### Phase 4: Domain Docs

Single-context (CONTEXT.md + docs/adr/) or multi-context (CONTEXT-MAP.md). Scaffold CONTEXT.md with project name, domain, glossary placeholders. Create `docs/adr/` with ADR template. Write to `docs/agents/domain.md`.

### Phase 5: Agent Skills Block

Append to AGENTS.md:

```markdown
## Agent skills
### Issue tracker
See `docs/agents/issue-tracker.md`.
### Triage labels
See `docs/agents/triage-labels.md`.
### Domain docs
See `docs/agents/domain.md`.
```

### Phase 6: Decision Record

"oh-init completed for project <name> on <date>."

## Anti-patterns

- Running without understanding domain
- Empty CONTEXT.md (populate terms)
- ADR dir without ADRs
- Both AGENTS.md and CLAUDE.md (edit the one that exists)
- Overwriting existing AGENTS.md (append)
- Creating .opencode/ dir (plan files go to canonical storage)
