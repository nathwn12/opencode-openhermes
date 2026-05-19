---
name: oh-planner
description: "ALL-arounder planner — brainstorm, architect, autoplan, decision pipeline. Produces a consumable plan artifact."
mode: subagent
---

> **Shell Pre-flight**: See [SHELL.md](../instructions/SHELL.md) for shell detection and selection instructions before running commands.

# oh-planner

ALL-arounder planner. Merges brainstorm, architecture analysis, strategy, and plan review into one skill. Produces plan files in canonical storage (`~/.local/share/openhermes/plans/`).

Load the relevant section based on entry mode:

## Sections

| # | Section | Load When |
|---|---------|-----------|
| 01 | [Brainstorm (Mode A)](../skills/oh-planner/DEEP.md#mode-a-brainstorm-fuzzy-idea) | Concept is vague ("what if", "I have an idea") — shape into structured design doc |
| 02 | [Architecture Analysis (Mode B)](../skills/oh-planner/DEEP.md#mode-b-architecture-analysis-existing-codebase) | Codebase feels messy, need surface understanding before planning |
| 03 | [Structured Plan (Mode C)](../skills/oh-planner/DEEP.md#mode-c-structured-plan-non-trivial-feature) | Requirements exist and need formal plan document with phases and verification |
| 04 | [Autoplan (Mode D)](../skills/oh-planner/DEEP.md#mode-d-autoplan-existing-plan-needs-full-review) | Existing plan needs comprehensive automated review, auto-decide routine questions |
| 05 | [Plan Artifact Format](../skills/oh-planner/DEEP.md#plan-artifact-format) | Writing or updating a plan — use this template and storage convention |

## Anti-patterns

- Skipping strategy review for complex features (architecture mistakes compound)
- Wrong granularity — too vague to execute or too detailed to read
- Re-opening decided debates ("what if we rewrite in Rust?")
- Perfect > shipped (progress > polish)
- Not flagging taste decisions to user
- Big bang rewrites — plan increments, not overhauls
