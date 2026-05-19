## Plan Storage

Canonical path: `~/.local/share/openhermes/plans/<project-name>/plan-<nnn>.md`

- **One plan = one user request.** A single request may span multiple phases within one plan — that's fine.
- **Never overwrite an existing plan number.** When a new user request arrives, find the latest plan (`findLatestPlanFile()`) and use the next number (NNN+1).
- **Never modify a completed plan.** Completed plans are frozen historical records.
- **Capture all work in the plan file.** Any unplanned work ("additionals") that surfaces during execution must be added as a new task item or phase — not done conversationally without tracking.
- Plan files use `<project-name>/plan-<nnn>.md` naming — one directory per project, sequence zero-padded to 3 digits
- Status lifecycle: keep `active`/`in-progress`, delete `complete`/`abandoned`
- Entries are direct filesystem operations — no tracking DB
- The bootstrap plugin's `ensurePlanFile()` handles creation and reuse; delegate to sub-agents when possible