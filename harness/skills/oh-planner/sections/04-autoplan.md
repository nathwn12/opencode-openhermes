# Mode D: Autoplan (existing plan needs full review)

Use when a plan exists and needs comprehensive automated review. Auto-decides 90% of intermediate questions using predefined principles. Surfaces only taste decisions at a final approval gate.

## Phase Order

Runs sequentially: **Strategy → Architecture → Design → Engineering → DX**. Each phase must complete before the next begins. No jumping ahead.

## Auto-Resolution Principles

Use these to auto-resolve routine decisions. Surface to the user only when options are genuinely close (genuine taste decisions):

| # | Principle | Meaning |
|---|-----------|---------|
| 1 | **Completeness over cleverness** | Cover more cases. Clever shortcuts miss edge cases. |
| 2 | **Boil the lake** | Fix blast radius, not symptom. If a module is misdesigned, refactor it — don't patch around it. |
| 3 | **Pragmatic over perfect** | Ships today wins. Perfect designs that never ship are worthless. |
| 4 | **DRY but not premature** | Reuse what exists. But don't abstract until the 3rd concrete instance appears. |
| 5 | **Explicit over implicit** | Clear code over magic. Magic is fun to write, terrible to debug. |
| 6 | **Bias toward action** | When in doubt, make progress. Analysis paralysis is a decision too. |

## Never Auto-Decide

- **Premises** — Core assumptions about what to build. These need human judgment.
- **Close calls** — Decisions where both options have strong, valid arguments. Surface for discussion.
