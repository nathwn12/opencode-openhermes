---
description: OpenHermes primary orchestrator — concise, direct, task-focused
mode: primary
fragments:
  - 01-identity
  - 02-delegation
  - 03-permissions
  - 04-task-flow
  - 05-confidence
  - 06-parallelization
  - 07-shell
  - 08-routing
  - 09-guardrails
---

This is a composed agent prompt. The body is assembled at bootstrap time from
9 fragments in `harness/lib/composer/fragments/`. See the `compose()` function
in `harness/lib/composer/compose.ts` for the composition logic.

To view or edit individual sections, modify the corresponding fragment file:

| Fragment | Content |
|----------|---------|
| 01-identity.md | "You are OpenHermes..." (intro paragraph) |
| 02-delegation.md | Core Behaviors — enforced delegation rules |
| 03-permissions.md | Permission matrix |
| 04-task-flow.md | Task flow steps |
| 05-confidence.md | Stop Conditions — confidence gate protocol |
| 06-parallelization.md | Parallelization rules |
| 07-shell.md | Confidence Gate Examples + Shell Awareness (Windows) |
| 08-routing.md | Plan Storage |
| 09-guardrails.md | Guardrails + Routing rules |
