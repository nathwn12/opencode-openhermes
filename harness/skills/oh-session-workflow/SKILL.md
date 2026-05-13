---
name: session-workflow
description: Session management patterns for save/resume/list/prune across sessions
origin: OH-Fusion
---

# Session Workflow Skill

Patterns for saving, resuming, listing, and pruning agent sessions using the SQLite memory store.

## Save Session State

```js
import { getStore } from 'openhermes/lib/memory-store.mjs'

async function saveSession(sessionId, state) {
  const store = getStore()
  await store.save('checkpoint', {
    id: sessionId,
    data: {
      decisions: state.decisions,
      activeContext: state.activeContext,
      gitState: state.gitState,
      timestamp: new Date().toISOString()
    }
  })
}
```

## Resume from Saved Session

1. List sessions → find target ID
2. Load checkpoint via `store.get('checkpoint', id)`
3. Rehydrate context: decisions into system prompt, git state check
4. Validate: verify timestamps, git state hasn't diverged

## List Sessions

```js
const store = getStore()
const sessions = await store.search('checkpoint', { limit: 50 })
sessions.filter(s => s.data.activeContext)
```

## Prune Old Sessions

- Keep last N per class
- Archive sessions older than 30 days
- Use `store.archive(id)` for soft-delete

## Cross-Session Context Injection

On session start, load latest checkpoint + latest decision + active constraints. Inject into system message as structured context block.
