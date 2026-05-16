---
name: oh-full-output
description: "Override LLM truncation — enforce complete code generation, ban placeholders."
tier: 2
route:
  pass: done
  fail: [surface, oh-expert]
  blocker: surface
---

# oh-full-output

Override truncation. Enforce complete generation. Ban placeholders.

## Steps

1. Scope — Count distinct deliverables. Lock the number.
2. Build — Generate every deliverable completely. No partial drafts.
3. Cross-check — Re-read request. Compare deliverable count. Add anything missing.
4. Verify — No banned patterns, every item present, code blocks are runnable, nothing shortened.

## Routing

| Outcome | Route |
|---------|-------|
| pass | → done |
| fail | → surface, oh-expert |
| blocker | → surface |
