---
description: Read and summarize the OpenHermes session log
agent: OpenHermes
---

Inspect the OpenHermes session log at `~/.local/share/opencode/log/openhermes.log`.

Return a structured summary grouped by session ID.

Focus on:

- `session.created`
- `session.compacted`
- `session.error`

For each session, show the timeline in order and highlight any error details.

Do not dump the whole log verbatim unless explicitly asked.
