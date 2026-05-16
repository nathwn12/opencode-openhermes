# Stage 2: Dual-Axis Review (parallel sub-agents)
- **Standards** — read documented standards (CONTEXT.md, AGENTS.md, eslint, ADRs). Report every violation. Cite source. Distinguish hard violations from judgment calls.
- **Spec** — read spec source (plan/issue/PRD). Report missing/partial requirements, scope creep, wrong implementations. Quote the spec.

Report independently. Do not merge or rank.

# Stage 3: Edge Case Sweep
- Error states — invalid inputs, missing files, network failure
- Concurrency — races, deadlocks, stale state
- Security — injection, auth bypass, data leakage
- Performance — N+1, unbounded loops, leaks
- State transitions — invalid transitions, partial updates

Per finding: severity (critical/major/minor), location, reproduction.
