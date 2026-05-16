---
name: oh-browser
description: "Browser automation via agent-browser CLI for web interaction and data extraction"
tier: 3
route:
  pass: surface
  fail: oh-browser
  blocker: surface
---

# oh-browser

Browser automation via agent-browser CLI. Navigate pages, fill forms, take screenshots, extract data.

## Steps

1. Install agent-browser and Chrome — `npm install -g agent-browser && agent-browser install`
2. Launch browser — `agent-browser open <url>` or `agent-browser open` then navigate
3. Snapshot page state — `agent-browser snapshot` returns accessibility tree with `@eN` refs
4. Interact using `@eN` refs — `agent-browser click/fill/select/hover @eN`
5. Extract data — `agent-browser get text/html @eN` or `agent-browser screenshot`
6. Close browser — `agent-browser close`

## Routing

| Outcome | Route |
|---------|-------|
| pass | → surface |
| fail | → oh-browser |
| blocker | → surface |
