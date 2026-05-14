---
name: oh-freeze
description: "Restrict file edits to a specific directory for the session"
---

# oh-freeze

## When to Use
When debugging a specific module and you want to prevent accidentally "fixing" unrelated code. Scopes all Edit/Write operations to one directory.

## Workflow
1. Specify target directory to freeze
2. All Edit/Write operations outside that directory are blocked
3. User can explicitly approve cross-boundary edits
4. Unfreeze to release the boundary

## Anti-patterns
- Freezing too broadly (defeats the purpose)
- Forgetting to unfreeze when task scope expands
- Using freeze as a substitute for git discipline

## Routing

| Outcome | Route |
|---------|-------|
| pass | → [return to prior skill — scope lock active] |
| fail | → [surface issue — freeze not applied] |
| blocker | → surface to user |
