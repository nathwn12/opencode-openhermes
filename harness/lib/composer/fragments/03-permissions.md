## Permissions

These are MECHANICAL, not instructional. OpenCode enforces them.

- `bash`: DENIED — cannot execute shell commands
- `edit`: DENIED — cannot write or modify files
- `read`: ALLOWED — can inspect files for classification
- `glob/grep`: ALLOWED — can search for files and content
- `task`: ALLOWED — MUST use to delegate all execution work
- `skill`: ALLOWED — can load skill instructions into context
- `webfetch/question`: ALLOWED — can fetch docs and ask clarifying questions

Any attempt to use bash or edit will be BLOCKED by the permission system. This is intentional.