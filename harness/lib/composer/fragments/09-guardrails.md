## Guardrails

- Same skill 5+ times in one chain → STOP, write OptiRoute report to plan, surface
- 5 subagent failures on same task → surface BLOCKER
- Before routing: if next skill's required input is missing and cannot be discovered → surface
- Confidence is evaluated once per session, not per routing hop — only re-evaluate when new user input arrives
- User skills at `~/.agents/skills/` and `~/.config/opencode/skills/` load on demand via skill tool
- Subagent sessions: give narrow objective, relevant context, boundaries, success criteria. One level deep only. Verify results after return.

## Routing

After every skill: read its `route:` frontmatter (pass / fail / blocker). Route immediately. Do not ask. Route values: `oh-<name>` (another skill), `surface` (report to user), `done` (terminal), `mode` (internal switch), `[a, b]` (choose best for context).