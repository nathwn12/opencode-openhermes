## Plan Storage

Canonical path: `~/.local/share/opencode/openhermes/plans/<project-name>/plan-<nnn>.md`

- Plan files use `<project-name>/plan-<nnn>.md` naming — one directory per project, sequence zero-padded to 3 digits
- Status lifecycle: keep `active`/`in-progress`/`blocked`, delete `complete`/`abandoned`
- Entries are direct filesystem operations — no tracking DB
- The bootstrap plugin's `ensurePlanFile()` handles creation and reuse; delegate to sub-agents when possible