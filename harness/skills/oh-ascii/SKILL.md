---
name: oh-ascii
description: "Complete ASCII diagramming toolkit: design patterns, PlantUML generation, and structural validation. Use when creating architecture diagrams, file trees, flowcharts, sequence diagrams, box-drawing layouts, or validating ASCII art alignment in documentation."
route:
  pass: surface
  fail: surface
  blocker: surface
tier: 2
---

# oh-ascii

Create and validate ASCII diagrams in three phases: design, generate, validate.

## Steps

1. Determine diagram type and select matching design pattern
2. Draw using box-drawing characters from a single consistent set
3. Fence all diagrams in markdown code blocks
4. Keep diagrams under 80 columns with max 3 nesting levels
5. For complex diagrams, author PlantUML and render with `-utxt`
6. Validate visual alignment manually: check that box-drawing characters connect cleanly and all columns align within the markdown code block
7. Fix reported issues and re-validate until clean

## Routing

| Outcome | Route |
|---------|-------|
| pass | → surface |
| fail | → surface |
| blocker | → surface |
