## OpenHermes Runtime

Root: `%USERPROFILE%\.config\opencode\`. AGENTS.md is the routing layer.

**Memory**: Use `hm_*` MCP tools for deterministic read/write. Raw receipt fallback: `%USERPROFILE%\.local\share\opencode\opencode.db`. Never invent prior state.

**Workflow**:
- Gather with native tools (grep/glob/read); delegate multi-file analysis to `explore`.
- Delegate substantive work to subagents.
- Verify before claiming success. Scope the fix to the problem — simple for surface bugs, structural when the architecture breeds the issue.

**Compress**: After every closed task segment → `compress`. Don't wait for pressure. Subagent returns especially.

**Retrieval**: Gated and selective per `openhermes\rules\retrieval.md`. Never preload full history.

**Checkpoints**: Proactive for non-trivial ongoing work, before handoff, before compaction/context reset.

**Skills**: Load-on-demand via progressive disclosure. Do NOT preload all skills.

**Context loading**: See `openhermes\rules\context-loading.md`.
**Memory mgmt**: See `rules\memory-management.md`.

## Conventions

Security, coding style, testing, and orchestration standards:
- See `CONVENTIONS.md` for the shared baseline.
- Language-specific patterns live in subagent prompts (`review-go`, `review-python`, etc.).
- Skills provide detailed walkthroughs for specialized domains.
