---
name: oh-guard
description: "Safety confirmation mode that warns before destructive operations."
tier: 2
route:
  pass: mode
  fail: mode
  blocker: surface
---

# oh-guard

Require confirmation before destructive operations.

## Steps

1. Identify the planned write/edit/delete operation
2. State the planned operation to the user
3. Ask for explicit confirmation
4. Proceed only on receiving explicit approval

## Routing

| Outcome | Route |
|---------|-------|
| pass | → mode |
| fail | → mode |
| blocker | → surface |
