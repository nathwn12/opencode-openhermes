---
name: oh-guard
description: "Use when performing destructive operations that need confirmation before proceeding. Safety confirmation mode that warns before destructive operations."
tier: 2
triggers:
  - "be careful"
  - "dont break anything"
  - "safety mode"
  - "guard mode"
route:
  pass: mode
  fail: mode
  blocker: surface
---

# oh-guard

## When to Use
When user says "be careful," "don't break anything," or context involves production, destructive changes, or irreversible actions.

## Mode
Before any write/edit/delete operation:
1. State the planned operation
2. Ask for confirmation
3. Proceed only on explicit approval

## What triggers a guard check
- File deletion or rename
- Git destructive operations (reset, rebase, force push)
- Dependency changes (add/remove/upgrade)
- Configuration changes affecting auth, network, data
- Any command with `--force`, `-f`, `--hard`, or destructive flags

## Anti-patterns
- Guarding trivial operations (wastes time)
- Forgetting to ask on genuinely destructive operations
- Asking for confirmation on reads or analysis steps

## Routing

| Outcome | Route |
|---------|-------|
| pass | → [return to prior skill — guard active] |
| fail | → [return to prior skill — guard lifted] |
| blocker | → surface |
