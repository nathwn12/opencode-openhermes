# oh-init — Phases 0-1: Check State & AGENTS.md

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
- Plan first. Write to `~/.local/share/opencode/openhermes/plans/<project>-plan-<nnn>.md` before multi-file changes.
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
- **Plan**: `~/.local/share/opencode/openhermes/plans/<project>-plan-<nnn>.md`
- **Never execute**: delegates everything to sub-agents
- **Verify before claim**: read files, run commands, confirm output
```
