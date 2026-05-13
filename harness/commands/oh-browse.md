---
description: Browser daemon — persistent Chromium automation (goto, click, fill, screenshot)
agent: oh-scraper
subtask: true
---

# Browser Command

Persistent Chromium automation via compiled daemon.

## Subcommands

- `start` — Launch browser daemon
- `goto <url>` — Navigate to URL
- `click <selector>` — Click element
- `fill <selector> <text>` — Fill form field
- `screenshot [path]` — Take screenshot
- `html [selector]` — Get page HTML (or element HTML)
- `text [selector]` — Get visible text (or element text)
- `stop` — Shut down browser daemon

## Examples

```
/oh-browse start
/oh-browse goto https://example.com
/oh-browse click "#login-button"
/oh-browse fill "#email" user@example.com
/oh-browse screenshot
/oh-browse stop
```
