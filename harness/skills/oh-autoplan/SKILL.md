---
name: oh-autoplan
description: "Run all reviews sequentially with auto-decisions using 6 decision principles"
---

# oh-autoplan

## When to Use
When a plan file exists and you want the full review gauntlet without answering 15-30 intermediate questions. Surfaces taste decisions at a final approval gate.

## Workflow
1. Read the plan file (PLAN.md, or provided inline)
2. Run CEO review — scope expansion/selective/hold/reduction
3. Run Design review — aesthetic, typography, layout, spacing, motion
4. Run Engineering review — architecture, data flow, edge cases, performance
5. Run DX review — developer experience, API design, onboarding
6. Surface taste decisions at a final approval gate

## Decision Principles
- **Avoid analysis paralysis** — if both options are fine, flip a coin
- **Default to boring** — proven patterns over novel architecture
- **Scope is a feature** — smaller scope = better execution
- **Prefer deletion** — removing code is better than adding it
- **Optimize for the next developer** — clarity over cleverness
- **Ship and iterate** — perfect is the enemy of shipped

## Anti-patterns
- Re-opening already-decided debates ("what if we rewrite in Rust?")
- Letting perfect be the enemy of shipped (progress > polish)
- Failing to flag taste decisions to the user
