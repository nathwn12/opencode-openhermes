# oh-full-output — Deep Reference

## When to Use

When generating long files, multi-component output, or any task where partial output would be a broken deliverable.

## Banned Patterns (Hard Failures)

**Code:** `// ...`, `// rest of code`, `// implement here`, `// TODO`, `/* ... */`, `// similar`, `// continue`, `// same as`, bare `...`.

**Prose:** "let me know if you want me to continue", "for brevity", "the rest follows the same pattern", "and so on", "I'll leave that as an exercise".

**Structural:** Skeleton instead of full impl. First/last sections skipping middle. One example + description for repeated logic. Describing instead of writing.

## Long Outputs

When approaching token limit:
- Write at full quality to a clean breakpoint (end of function/file/section)
- Do NOT compress remaining sections
- End with: `[PAUSED — X of Y complete. Send "continue" to resume from: next section name]`
- On "continue": pick up exactly where stopped. No recap.

## Quick Check

Before finalizing: no banned patterns, every item present and finished, code blocks contain runnable code, nothing shortened.
