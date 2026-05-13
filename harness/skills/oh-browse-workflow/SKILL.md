---
name: browse-workflow
description: Browser automation patterns for persistent Chromium daemon
origin: OH-Fusion
---

# Browse Workflow Skill

Browser automation via compiled Chromium binary (not Playwright). Persistent daemon with auth.

## Daemon Lifecycle

### Start Daemon
```bash
# Random port, bearer token auth
browser-daemon --port 0 --token <auth-token>
```

### Stop Daemon
```bash
browser-daemon stop
```

## Navigation

```bash
# Navigate to URL
browser-daemon navigate https://example.com

# Wait for element
browser-daemon wait selector=.content --timeout 5000
```

## Element Interaction

- `click selector`: Click matched element
- `fill selector text`: Type into input
- `select selector value`: Choose option
- `hover selector`: Hover over element

## Screenshot Capture

```bash
browser-daemon screenshot --selector ".main" --output screenshot.png
```

## Content Extraction

```bash
# Get visible text
browser-daemon text --selector "body"

# Get outer HTML
browser-daemon html selector=.content

# Extract structured data
browser-daemon extract --selector "tr.item" --fields "name,price"
```

## Cookie Persistence

Cookies survive daemon restarts. Stored in profile directory. Use for authenticated sessions across automation runs.

## Security

- Localhost-only binding
- Bearer token auth on every request
- Random port allocation (0 → OS-assigned)
- NO remote access, NO WebSocket
