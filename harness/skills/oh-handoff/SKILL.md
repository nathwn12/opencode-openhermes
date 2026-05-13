---
name: oh-handoff
description: "Compact session state into a structured handoff document"
---

# oh-handoff

## When to Use
When switching contexts, ending a session, or passing work to another agent or developer. Produces a compact summary that captures everything needed to resume.

## Handoff Document Structure
- **Context** — what were we doing?
- **State** — what's done, what's pending, what's blocked?
- **Decisions** — key decisions made this session
- **Artifacts** — files changed, created, or referenced
- **Next steps** — ordered list of what to do next
- **Risks** — things to be aware of

## Output
A `HANDOFF.md` or structured text block with all resume-relevant information.

## Anti-patterns
- Writing a novel (handoff should be scannable in 30 seconds)
- Omitting decisions (why we chose X over Y is critical context)
- No next steps ("figure it out" is not a handoff)
