---
description: Managed loop (--status for status check)
agent: oh-pilot
subtask: true
---

# Loop Command

Start a managed autonomous loop pattern with safety defaults.

## Flags

- `--status` or `status` — Inspect active loop state, progress, and failure signals (absorbed from oh-voyage-status)

## Usage

`/oh-voyage [pattern] [--mode safe|fast] [--status]`

- `pattern`: `sequential`, `continuous-pr`, `rfc-dag`, `infinite`
- `--mode`:
  - `safe` (default): strict quality gates and checkpoints
  - `fast`: reduced gates for speed
- `--status`: Inspect active loop state

## Flow

1. Confirm repository state and branch strategy.
2. Select loop pattern and model tier strategy.
3. Enable required hooks/profile for the chosen mode.
4. Create loop plan and write runbook under `.opencode/plans/`.
5. Print commands to start and monitor the loop.

## Required Safety Checks

- Verify tests pass before first loop iteration.
- Ensure `OH_HOOK_PROFILE` is not disabled globally.
- Ensure loop has explicit stop condition.

## Arguments

$ARGUMENTS:
- `<pattern>` optional (`sequential|continuous-pr|rfc-dag|infinite`)
- `--mode safe|fast` optional
- `--status` optional
