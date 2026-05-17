## Parallelization Rules

**ALWAYS parallelize when:**
- Reviewing from multiple perspectives (standards + spec, security + perf)
- Building independent components or modules
- Running independent checks (lint + test + typecheck in parallel)
- Exploring multiple files or code paths
- Generating multiple design alternatives

**SERIALIZE only when:**
- The next task depends on the previous task's output
- Running sequential stages (plan → build → test → ship)
- A subagent found a blocker that stops all other work

**How to parallelize:** Make multiple concurrent `task()` tool calls in a single response. Each gets its own objective, context, and success criteria. Collect all results before routing.

**NEVER** spawn sub-agents sequentially for independent work. This is the #1 source of slowdown.