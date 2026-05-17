---
description: Diagnose OpenHermes + OpenCode health with concrete file-level checks
agent: OpenHermes
---

Run a structured 8-category diagnostic. For each check, inspect the actual files on disk and report PASS/FAIL/WARN with evidence.

## 1. Plugin load path

**What to check:**
- Read `%USERPROFILE%\.config\opencode\opencode.jsonc` — verify the `plugin` array contains `"openhermes@git+https://github.com/nathwn12/openhermes.git#dev"`.
- Check for trailing commas: line 23 has a known trailing `,` after the single plugin entry. The parser may fail on this.
- Check the resolved install path: `%USERPROFILE%\.cache\opencode\packages\openhermes@git+https_/github.com/nathwn12/openhermes.git#dev/node_modules/openhermes/` — does it exist? Does `harness/` and `index.ts` resolve?

**Troubleshooting:**
- Trailing comma fix: remove `,` from end of line 23 in opencode.jsonc.
- If the plugin path doesn't match, update opencode.jsonc to point to the correct git ref.
- If the package directory is missing, OpenCode reinstalls on next launch. Restart and check again.

---

## 2. Skills discovery

**What to check:**
- Count directories in `harness/skills/` — expect exactly 30.
- Spot-check 3 SKILL.md files for valid YAML frontmatter (must have `name`, `description`, `route`, `tier`, `triggers`).
- Verify bootstrap.ts injects `config.skills.paths` with two sources: the built-in skills dir AND user skill dirs (`~/.agents/skills/`, `~/.config/opencode/skills/`, `~/.claude/skills/`).
- Verify NO symlinks are required — discovery uses the plugin API `config.skills.paths` mechanism.

**Expected current count:** 30 (confirmed directories match filesystem)

---

## 3. Command registration

**What to check:**
- List `harness/commands/` — expect exactly 2 `.md` files: `oh-doctor.md` and `oh-log.md`.
- Read each file's frontmatter — both must have `description` + `agent: OpenHermes`.
- Verify bootstrap.ts `commandDefinitions()` reads this directory and merges into `config.command`.

---

## 4. Agent registration

**What to check:**
- List `harness/agents/` — expect exactly 17 `.md` files (1 primary + 16 subagents).
- Read `openhermes.md` frontmatter — must have `mode: primary`.
- Verify primary agent permissions in bootstrap.ts (lines 370-391): `bash: deny`, `edit: deny`, `task: allow`.
- Verify 16 subagents have explicit permissions in `SUBAGENT_PERMISSIONS` (lines 335-350): `bash: allow`, `edit: allow`, `task: { "oh-*": "deny" }`.
- Verify delegation loop guard (line 424): max depth = 10.
- Verify `oh-planner` + `oh-grill` + `oh-skill-craft` are hidden from @-menu (line 366).

**Expected:** 17 entries, no missing agent definitions, all permissions assigned.

---

## 5. Instruction injection

**What to check:**
- Verify all 3 files exist:
  - `harness/codex/CHARTER.md` (target: ~80 lines)
  - `harness/codex/AUTOPILOT.md` (target: ~200 lines)
  - `harness/instructions/SHELL.md` (76 lines)
- Each file must be > 0 bytes and not a placeholder/stub.
- Verify bootstrap.ts injects both `harness/codex/` and `harness/instructions/` directories via `config.instructions`.

---

## 6. Package integrity

**What to check:**
- Read `package.json` — verify these fields:
  - `name: "openhermes"`
  - `version` — note current version
  - `exports: { ".": "./index.ts", "./bootstrap": "./bootstrap.ts" }`
  - `files` — all 13 entries must resolve to real files/dirs on disk
- Read `tsconfig.json` — must have: `strict: true`, `target: ESNext`, `module: ESNext`, `moduleResolution: bundler`.
- Verify `lib/harness-resolver.ts` — check its `REQUIRED_HARNESS_FILES` (CHARTER.md, AUTOPILOT.md, oh-planner/SKILL.md) all resolve from the harness root.
- Check `scripts/` directory — `oh-doctor.ps1` exists. This is the companion diagnostic script.
- Run `bun test` if available — note any failures.

---

## 7. Auth & config safety

**What to check (grep entire project dir):**
- `.env*` — expect 0 matches
- `*.key` — expect 0 matches
- `*secret*` — expect 0 matches
- `credentials*` — expect 0 matches
- `auth.json` — expect 0 matches (should be at `%USERPROFILE%\.local\share\opencode\auth.json`, outside the project)
- Read `.gitignore` — must cover: `node_modules/`, `.config/`, `.opencode/`, `PLAN.d/`, `coverage/`, `*.tgz`

---

## 8. Documentation accuracy

**What to check:**
Read `AGENTS.md` and compare its claims against the actual filesystem. Known discrepancies to flag:

| Claim | Actual | Status |
|---|---|---|
| Line 22: "30 skills (see below)" | Directory has 30 skills | Up to date |
| Line 19: \`harness/instructions/ — SHELL.md\` | Directory only has SHELL.md | Up to date |

---

## Quick-wins (automated)

For instant automated checks, run the companion PowerShell script which outputs JSON-Lines diagnostics consumable by the OpenHermes orchestrator:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/oh-doctor.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/oh-doctor.ps1 -SkipOCChecks
```

This script checks:

1. **AGENTS.md accuracy** — skill count (expects 30) and file references
2. **Package files field** — all `package.json` `files` entries exist on disk
3. **Harness prerequisites** — CHARTER.md, AUTOPILOT.md, oh-planner/SKILL.md resolve
4. **Test health** — `bun test` pass/fail counts
5. **TypeScript compilation** — `bunx tsc --noEmit` clean check
6. **Secrets scan** — .env, *.key, credentials, auth.json in repo
7. **.gitignore coverage** — expected entries present
8. **Runtime checks** — opencode CLI paths, plugin load, skills discovery (skippable)

Each check reports PASS/FAIL/WARN with evidence and a suggested fix.

---

## Troubleshooting reference

Use these when a check fails.

### Config won't parse
```
%USERPROFILE%\.config\opencode\opencode.jsonc
```
- Trailing commas: JSONC tolerates them in some parsers but OpenCode's validator rejects them.
- Fix: open the file and remove any trailing `,` after the last array/object element.
- Test: run `opencode --print-logs` — parser errors appear in the first few lines.

### Plugin won't load
- Temporarily disable all plugins by setting `"plugin": []` in opencode.jsonc.
- Restart. If OpenCode works, re-enable plugins one at a time.
- If the app crashes on launch, check `%USERPROFILE%\.config\opencode\plugins\` directory and move it aside.

### Stuck or corrupted cache
- Clear the full cache: `rm -rf %USERPROFILE%\.cache\opencode` (Windows: delete `%USERPROFILE%\.cache\opencode`).
- This forces OpenCode to reinstall provider packages on next launch.
- This resolves `AI_APICallError` and stale provider package issues.

### Authentication failures
- Run `/connect` in the TUI to re-authenticate.
- Check auth file: `%USERPROFILE%\.local\share\opencode\auth.json` — should be >0 bytes and valid JSON.
- If corrupted: delete the file, then re-run `/connect`.

### Model not found / ProviderModelNotFoundError
- Run `opencode models` to see available models.
- Model format: `<providerId>/<modelId>` (e.g. `openai/gpt-4.1`).
- Verify the provider is authenticated and has access to the requested model.

### Log inspection
- Logs at `%USERPROFILE%\.local\share\opencode\log\` — newest file first.
- Run `opencode --log-level DEBUG` for verbose output.
- Run `/oh-log` in OpenCode to read OpenHermes-specific session logs.

### ProviderInitError
- Corrupted or invalid configuration in `~/.local/share/opencode`.
- Last resort: delete `~/.local/share/opencode` and re-authenticate with `/connect`.

---

## Report format

Summarize diagnostics as:

```
## Diagnosis

### PASS items
- check name — evidence

### FAIL / WARN items
- ❌ FAIL: check name — evidence — fix
- ⚠️ WARN: check name — evidence — suggestion

### Issues table
| # | Severity | Check | File | Fix |
|---|----------|-------|------|-----|

### Next actions
1. Priority action — command or manual step
2. ...
```

## Routing

| Outcome | Route |
|---------|-------|
| All PASS or WARN only | → surface report to user |
| Any FAIL | → oh-investigate (diagnose issues found) |
| Unrecoverable (env broken) | → surface to user with findings |
