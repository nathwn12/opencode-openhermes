# oh-browser — Deep Reference

## When to Use

User needs to interact with websites, automate browser tasks, scrape data, or test web applications. Triggers include: "open a website", "fill out a form", "click a button", "take a screenshot", "scrape data", "test this web app", "login to a site", "automate browser", "browser automation", "web scraping", "check slack".

## Prerequisites

- agent-browser installed globally: `npm install -g agent-browser && agent-browser install`
- Chrome/Chromium (auto-downloaded by `agent-browser install`)
- State files contain session tokens — add to `.gitignore`, never commit

## Common Patterns

- **Annotated screenshots**: `agent-browser screenshot --annotate` — overlays numbered labels matching `@eN` refs. Most reliable method for visual QA and multimodal AI workflows.
- **Batch execution**: `agent-browser batch "open url" "snapshot" "click @e1"` — avoids per-command startup overhead for multi-step workflows.
- **Session persistence**: `--session-name <name>` — auto-saves/restores cookies and localStorage. Login once, reuse across sessions.
- **Auth vault**: `agent-browser auth save <name> --url <url> --username <user>` — stores encrypted credentials. LLM never sees passwords.
- **Diff**: `agent-browser diff snapshot` — compare current vs last snapshot for change detection. `agent-browser diff screenshot --baseline before.png` for visual pixel diff.
- **Chrome profile reuse**: `--profile Default` — use existing Chrome login state with zero setup.
- **Tab labeling**: `agent-browser tab new --label docs <url>` — memorable labels, not numeric indices.
- **Parallel scrape**: Use `batch --json` with piped command arrays for structured multi-page workflows.

## Common Commands Reference

| Task | Command |
|------|---------|
| Open URL | `agent-browser open <url>` |
| Get page state | `agent-browser snapshot -i` (interactive only) |
| Click | `agent-browser click @eN` or `agent-browser click "css-selector"` |
| Type text | `agent-browser fill @eN "text"` |
| Screenshot | `agent-browser screenshot --annotate` |
| Extract text | `agent-browser get text @eN` |
| Run JS | `agent-browser eval "document.title"` |
| Wait for element | `agent-browser wait ".selector"` |
| Scroll | `agent-browser scroll down 200` |
| Multi-step | `agent-browser batch "cmd1" "cmd2" "cmd3"` |

## Anti-patterns

- Forgetting `agent-browser install` first (Chrome won't be available)
- Not closing browser sessions (daemon processes leak)
- Using CSS selectors when `@eN` refs from snapshot are faster and more reliable
- Running individual commands instead of batch for multi-step workflows
- Passing credentials in prompts instead of using auth vault
- Committing state files with session tokens to git

## Security

- Use `--allowed-domains "example.com"` to restrict navigation to trusted domains
- Use auth vault instead of passing credentials in LLM prompts
- Session state files contain tokens — keep in `.gitignore`
- `--action-policy ./policy.json` gates destructive actions
- `--content-boundaries` wraps page output in delimiters to distinguish tool output from page content
