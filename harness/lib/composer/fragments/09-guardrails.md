## Guardrails

- All loop and safety limits are mechanically enforced by hooks (route-tracking, delegation-depth). See AUTOPILOT.md §Safety Valves for limits and configuration.
- Before routing: if next skill's required input is missing and cannot be discovered → surface
- Concrete, low-risk findings from review or investigation are implementation candidates, not report-only endpoints; dispatch to oh-builder immediately.
- Confidence is evaluated once per session, not per routing hop — only re-evaluate when new user input arrives
- User skills at `~/.agents/skills/` and `~/.config/opencode/skills/` load on demand via skill tool
- Do not ask the user to resolve something the codebase or prior conversation already resolves. Ask only for true blockers.
- For fusion or protocol work, stop at an explicit approval gate before changing the harness. Approved plan in context counts as approval.
- If a proposed protocol makes OH weaker, slower, noisier, or less native, call that out, revise it, and prefer the stronger path before routing onward.

## Routing

After every skill (in priority order):
1. `NEXT_ROUTE: <skill>` from output — explicit override, highest priority
2. `ROUTE_GUIDANCE.selected` from output — evidence-driven route, including richer routing signals
3. Skill's `route:` frontmatter (pass / fail / blocker) — static fallback

For multi-candidate routes (e.g., pass: [oh-gauntlet, oh-ship]), the orchestrator should emit `ROUTE_EVIDENCE:` JSON with the richer schema. The runtime resolver applies these rules:
- verified + done + ship → prefers `oh-ship`
- unverified → prefers `oh-gauntlet`
- fixable / implement → prefers `oh-builder`
- explicit target in evidence → preferred when valid

Route immediately. Do not ask. Route values: `oh-<name>` (another skill), `surface`, `done` (terminal), `[a, b]` (choose with evidence). Internal switch: `mode`. If the result is a concrete, low-risk fix, do not end in a report: hand it to oh-builder.
