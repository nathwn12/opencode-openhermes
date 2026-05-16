# oh-handoff — Deep Reference

## When to Use

Session ending, context switch, passing work to another agent, or user says "handoff." Produces a structured document the next session/agent can consume without re-reading the conversation.

## Anti-patterns

- Writing a transcript instead of a structured summary
- Including irrelevant context or raw logs
- Omitting key decisions or blockers
- Over 500 tokens (handoff must be compact)

## Output Template

```markdown
## Goal
<what this session was trying to achieve>

## Progress
### Done
- <completed items>

### In Progress
- <current work>

### Blocked
- <blockers>

## Key Decisions
- <decision> — <rationale>

## Critical Context
<bare essentials the next session MUST know>

## Relevant Files
- <file> — <why it matters>

## Next Steps
- <immediate next action>
```

## Rules

- Keep under 500 tokens if possible
- Only what the next session needs to continue — not a transcript
- Reference plan files by path, don't duplicate content
- If blockers exist, state what's needed to resolve
