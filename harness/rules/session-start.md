# Session-Start Checklist

Run this at the start of every new session and every resume before substantive work.

## Checklist

1. Read `%USERPROFILE%\.config\opencode\AGENTS.md` and keep it active as the router.
2. Load openhermes status from `%USERPROFILE%\.config\opencode\ohc.json` if rule paths or memory locations are needed.
3. **Read autorecall cache**: If `openhermes\memory\recall\cache.json` exists, load it — it contains active checkpoint, constraints, decisions, and mistakes from the prior session. The autorecall plugin writes this at session start. Use this context before probing MCP tools.
4. Check only the smallest relevant curated memory slice in `openhermes\memory\`:
   - latest checkpoint via `ohc_latest`
   - active decisions via `ohc_latest` or a narrow `ohc_search`
   - active constraints via `ohc_latest` or a narrow `ohc_search`
   - recent same-type mistakes only if the task matches a known pattern
   - do not read whole memory indexes unless the task is explicitly about index auditing or repair
5. If no relevant memory exists, proceed fresh without pretending there is prior state.
6. If last openhermes audit is missing or older than 7 days, flag `/harness-audit` as due.
7. Before substantial work, choose the smallest correct path:
   - native read/grep/glob for search/gather
   - `explore` subagent for multi-file analysis
   - specialist subagent for substantive implementation, review, or diagnosis

## User Entry Points

- `/openhermes`: bootstrap openhermes state, summarize current readiness, and surface due actions.
- `/harness-audit`: run an openhermes audit workflow and return findings.

## Output Contract

Keep session-start output terse:
- current openhermes state
- memory found or not found
- audit freshness
- immediate next action
