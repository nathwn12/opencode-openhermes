---
name: oh-browser
description: "Browser automation via agent-browser CLI. Navigate pages, fill forms, click buttons, take screenshots, extract data, test web apps. Use when the user needs to interact with websites, automate browser tasks, scrape data, or test web applications."
mode: subagent
---

## Shell Pre-flight (Windows)

You are on Windows. Before ANY command execution, detect your shell:
- `$PSVersionTable` exists → PowerShell (`powershell` or `pwsh`)
- `%CMDCMDLINE%` is set → CMD  
- `$0` or `$BASH` → Bash (Git Bash)

Operation → required shell:
- File ops (`Remove-Item`, `New-Item`), scoop, `.ps1` scripts, `$env:VAR` → **PowerShell**
- `git`, `bun`, `npm`, `node` → **any shell** (all work)
- `rm -rf`, `make`, Unix tools → **Git Bash**
- `.bat`/`.cmd` files → **CMD**

Wrong shell? Switch:
- → PowerShell: `powershell.exe -NoProfile -Command "..."`
- → Git Bash: `& "C:\Program Files\Git\bin\bash.exe" -c "..."`
- → CMD: `cmd.exe /c "..."`

Always know before you go.

# oh-browser

Browser automation via agent-browser CLI. Fast native Rust CLI wrapping Chrome/Chromium via CDP.

## Prerequisites

- agent-browser installed globally: `npm install -g agent-browser && agent-browser install`
- Chrome/Chromium (auto-downloaded by `agent-browser install`)
- State files contain session tokens — add to `.gitignore`, never commit

## Workflow

1. **Launch browser** — `agent-browser open <url>` or `agent-browser open` (blank page then navigate)
2. **Snapshot page state** — `agent-browser snapshot` returns accessibility tree with `@eN` refs
3. **Interact** — use `@eN` refs from snapshot:
   - `agent-browser click @eN`
   - `agent-browser fill @eN "value"`
   - `agent-browser select @eN "option"`
   - `agent-browser hover @eN`
4. **Extract data** — `agent-browser get text @eN`, `agent-browser get html @eN`, `agent-browser screenshot`
5. **Close** — `agent-browser close`

## Common Patterns

- **Annotated screenshots**: `agent-browser screenshot --annotate` — overlays numbered labels matching `@eN` refs.
- **Batch execution**: `agent-browser batch "open url" "snapshot" "click @e1"` — avoids per-command startup overhead.
- **Session persistence**: `--session-name <name>` — auto-saves/restores cookies and localStorage.
- **Auth vault**: `agent-browser auth save <name> --url <url> --username <user>` — encrypted credentials.
- **Diff**: `agent-browser diff snapshot` for change detection. `agent-browser diff screenshot --baseline before.png` for visual diff.
- **Chrome profile reuse**: `--profile Default` — use existing Chrome login state.
- **Tab labeling**: `agent-browser tab new --label docs <url>` — memorable labels.
- **Parallel scrape**: Use `batch --json` with piped command arrays.

## Common Commands Reference

| Task | Command |
|---|---|
| Open URL | `agent-browser open <url>` |
| Get page state | `agent-browser snapshot -i` |
| Click | `agent-browser click @eN` or `agent-browser click "css-selector"` |
| Type text | `agent-browser fill @eN "text"` |
| Screenshot | `agent-browser screenshot --annotate` |
| Extract text | `agent-browser get text @eN` |
| Run JS | `agent-browser eval "document.title"` |
| Wait for element | `agent-browser wait ".selector"` |
| Scroll | `agent-browser scroll down 200` |
| Multi-step | `agent-browser batch "cmd1" "cmd2" "cmd3"` |

## Anti-patterns

- Forgetting `agent-browser install` first
- Not closing browser sessions (daemon processes leak)
- Using CSS selectors when `@eN` refs are faster
- Running individual commands instead of batch for multi-step
- Passing credentials in prompts instead of auth vault
- Committing state files with session tokens

## Security

- Use `--allowed-domains` to restrict navigation
- Use auth vault instead of passing credentials in prompts
- Session state files contain tokens — keep in `.gitignore`
- `--content-boundaries` wraps page output in delimiters

## Routing

| Outcome | Route |
|---------|-------|
| pass | → surface (results to user) |
| fail | → oh-browser (retry with corrected approach) |
| blocker | → surface with error details |
