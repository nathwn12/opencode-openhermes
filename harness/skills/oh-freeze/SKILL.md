---
name: oh-freeze
description: "Restrict file edits to a specific directory for the session"
tier: 2
triggers:
  - "freeze directory"
  - "only edit in"
  - "dont touch other files"
route:
  pass: mode
  fail: mode
  blocker: surface
---

# oh-freeze

## When to Use
When the user says "don't touch anything outside [path]" or "only edit files in [dir]." Prevents accidental edits to configuration, infrastructure, or unrelated modules.

## Mode
- Allowed paths: only the specified directory and its children
- If you need to edit outside: state the reason and ask
- Read operations unrestricted anywhere
- File creation restricted to allowed paths

## Anti-patterns
- Editing outside allowed path without asking
- Reading unrelated files for context and using that to justify edits
- "Just this one file outside" — ask first

## Routing

| Outcome | Route |
|---------|-------|
| pass | → [return to prior skill — freeze active] |
| fail | → [return to prior skill — reverting to unfrozen] |
| blocker | → surface |
