---
name: oh-full-output
description: "Override LLM truncation behavior. Enforce complete code generation, ban placeholder patterns (// ..., /* ... */, TODO, 'rest of code'), and handle token-limit splits cleanly. Use when generating long files, multi-component output, or any task where partial output would be a broken deliverable."
tier: 2
triggers:
  - "full output"
  - "complete code"
  - "no truncation"
  - "dont skip"
  - "no placeholders"
  - "banned patterns"
  - "generate everything"
  - "dont abbreviate"
  - "dont use ..."
  - "no etc"
  - "write it all"
  - "exhaustive"
  - "unabridged"
  - "long file"
  - "large output"
  - "many files"
  - "all components"
  - "stop truncating"
route:
  pass: done
  fail: surface
  blocker: surface
---

# oh-full-output

Override truncation. Enforce complete generation. Ban placeholders. Handle token splits cleanly. Partial output = broken output.

## Banned Patterns (hard failures)

**Code:** `// ...`, `// rest of code`, `// implement here`, `// TODO`, `/* ... */`, `// similar`, `// continue`, `// same as`, bare `...`.

**Prose:** "let me know if you want me to continue", "for brevity", "the rest follows the same pattern", "and so on", "I'll leave that as an exercise".

**Structural:** Skeleton instead of full impl. First/last sections skipping middle. One example + description for repeated logic. Describing instead of writing.

## Process

1. **Scope** — Count distinct deliverables. Lock number.
2. **Build** — Generate every deliverable completely. No partial drafts.
3. **Cross-check** — Re-read request. Compare deliverable count. Add anything missing before responding.

## Long Outputs

When approaching token limit:
- Write at full quality to a clean breakpoint (end of function/file/section)
- Do NOT compress remaining sections
- End with: `[PAUSED — X of Y complete. Send "continue" to resume from: next section name]`
- On "continue": pick up exactly where stopped. No recap.

## Quick Check
Before finalizing: no banned patterns, every item present and finished, code blocks contain runnable code, nothing shortened.

## Routing

| Outcome | Route |
|---------|-------|
| pass | → continue current task |
| truncation persists | → oh-expert (diagnose attention/context) |
| blocker | → surface |
