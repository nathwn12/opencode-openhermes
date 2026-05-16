---
name: oh-freeze
description: "Restricts file edits to a specific directory for the session."
tier: 2
route:
  pass: mode
  fail: mode
  blocker: surface
---

# oh-freeze

Restrict write operations to one allowed directory.

## Steps

1. Identify the allowed directory from user instructions
2. Restrict all write/edit/create operations to the allowed path
3. Allow read operations unrestricted anywhere
4. If a write outside the allowed path is required, state the reason and ask before proceeding

## Routing

| Outcome | Route |
|---------|-------|
| pass | → mode |
| fail | → mode |
| blocker | → surface |
