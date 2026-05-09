# Context File Loading

## Priority Chain (first match wins)
1. `.hermes.md`
2. `AGENTS.md`
3. `CLAUDE.md`
4. `.cursorrules`
5. `.cursor/rules/*.mdc`

`openhermes/constitution/soul.md` loads independently — always injected as `OPENHERMES PERSONALITY`, frozen at session start.

## Progressive Subdirectory Discovery
When navigating into subdirs, check target dir + up to 3 parents for context files. Appended to tool result (not system prompt). Each subdirectory checked once per session.

## Size Limits

| Scope | Limit | Truncation |
|-------|-------|------------|
| Startup context | 20K chars | 70/20/10 head/tail/marker |
| Subdirectory context | 8K chars | 70/20/10 |
| SOUL.md (personality) | 4K chars | Hard cap at 4K |

## Injection Scanning

All context files scanned before loading. Blocked files log a mistake record and are not loaded.

| Pattern class | Examples |
|---------------|----------|
| Instruction override | "ignore previous instructions", "system prompt:", "you are now" |
| Deception | "do not tell the user", "do not reveal", "never disclose" |
| Credential exfiltration | `curl ... $API_KEY`, `base64 .env`, `http://evil.com/"+secret` |
| Hidden content | `<!--`, `<div style="display:none"` |
| Unicode attacks | zero-width space (U+200B), bidi override (U+202E), word joiner (U+2060) |
