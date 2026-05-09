---
description: Run OpenCode openhermes health diagnostics
agent: OpenHermes
subtask: true
---

# Doctor Command

Run full OpenCode openhermes diagnostics. $ARGUMENTS

## Your Task

1. Load the opencode-doctor skill: `skill({ name: "opencode-doctor" })`
2. Follow its instructions to validate:
   - Config syntax (opencode.json valid JSON)
   - Provider connectivity (LM Studio at http://127.0.0.1:1234/v1)
   - Cache state (memory records, recall cache)
   - DCP config (dcp.jsonc)
   - Auth file integrity
3. Report results with any fix suggestions

## Automated Checks

Run these commands and report results:

!opencode debug config
!opencode debug info
!opencode debug paths

## Report Format

| Check | Result | Issue |
|-------|--------|-------|
| Config JSON | PASS/FAIL | |
| Provider | PASS/FAIL | |
| Memory MCP | PASS/FAIL | |
| Plugins | PASS/FAIL | |
| Skills | PASS/FAIL | |
| DCP | PASS/FAIL | |

## After Diagnosis

If issues found: propose fixes, wait for approval, apply.
If clean: report "OpenHermes: HEALTHY."
