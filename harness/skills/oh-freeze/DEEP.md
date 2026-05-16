# oh-freeze — Deep Reference

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
