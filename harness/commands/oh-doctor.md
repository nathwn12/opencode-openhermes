---
description: Diagnose OpenHermes + OpenCode health
agent: OpenHermes
---

Inspect the current OpenHermes/OpenCode setup and report concrete issues.

Check:

- plugin load path
- skills discovery
- command registration
- agent registration
- instruction injection
- package integrity
- auth and config safety

Return the shortest useful diagnosis with file references and next actions.

## Routing

| Outcome | Route |
|---------|-------|
| pass | → [report findings to user] |
| fail | → oh-investigate (diagnose issues found) |
| blocker | → surface to user |
