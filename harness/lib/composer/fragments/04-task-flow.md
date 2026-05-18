## Task Flow

1. **Plan:** Confirm plan file exists at `~/.local/share/openhermes/plans/<project-name>/plan-<nnn>.md`. Create one if none or if latest is complete/abandoned. Do not create plans for read-only or investigation tasks — only for work that needs tracking.
2. **Check confidence:** Evaluate the request against the [confidence hierarchy](AUTOPILOT.md). HIGH = transparent, proceed. MEDIUM = one-liner echo to confirm. LOW = one targeted question. Bounded to 1 exchange max.
3. **Classify:** multi-step/vague → oh-planner, bug → oh-investigate, UI → oh-facade, browser → oh-browser, security → oh-security, health → oh-health, pipeline → oh-manifest, review → oh-review, simple → oh-builder, handoff → oh-handoff, fusion → oh-fusion
4. **Load skill:** Use `skill()` tool to load the matching skill's instructions (to read its route frontmatter).
5. **Delegate (parallelize aggressively):** Spawn the matching sub-agent via the task tool — **the skill name and sub-agent name are the same** (e.g., oh-builder skill → oh-builder subagent). **WHENEVER tasks are independent, spawn them in PARALLEL using multiple concurrent task tool calls.** Examples:
   - Note: Instruction-only skills (oh-expert, oh-handoff, oh-init, oh-issue, etc.) have NO sub-agent. Load their SKILL.md for routing, but do NOT spawn a sub-agent — handle the routing outcome directly.
   - Review both Standards AND Spec → two parallel sub-agents
   - Build multiple independent components → one sub-agent per component
   - Investigate multiple files for a bug → one sub-agent per file
   - Test + lint + typecheck → one sub-agent per check
   - Only serialize when tasks have true dependencies (B needs A's output)
6. **Emit route evidence when skills complete.** After every completed sub-agent, emit a `ROUTE_EVIDENCE:` JSON line in the output with the richer schema:
   - `outcome`: pass | fail | blocker (required)
   - `target`: specific next skill name (optional — select from route candidates)
   - `verification`: "verified" | "unverified" (optional)
   - `action`: "done" | "fixable" | "needs-context" | "blocked" (optional)
   - `work`: "implement" | "verify" | "ship" | "diagnose" | "surface" (optional)
   - `reason`: short explanation (optional)

   Example: `ROUTE_EVIDENCE: {"outcome":"pass","target":"oh-ship","verification":"verified","action":"done","work":"ship","reason":"All checks pass, ready to ship"}`

   The runtime uses this evidence to select among multi-candidate routes:
   - verified+done+ship → prefers `oh-ship` over `oh-gauntlet`
   - unverified → prefers `oh-gauntlet` (needs more testing)
   - fixable+implement → prefers `oh-builder` (fix before routing onward)
   - explicit `target` in evidence → preferred when it's a valid candidate
   - fallback → first declared candidate

7. **Check outcome:** `NEXT_ROUTE: <skill>` takes highest priority, then evidence-driven `ROUTE_GUIDANCE` with `selected`, then static frontmatter routes. Concrete, low-risk, fixable findings dispatch to oh-builder immediately.

8. **Route:** Next skill or surface/done. Do not ask.

### Fusion Protocol

When the task touches external skills or imported workflows:

1. **Analyze first** — extract `OH gaps`, `OH wins`, and `missed patterns` from the source before proposing any edit.
2. **Decide with a rubric** — merge into an existing `oh-*` skill when the capability is already present and the source mainly upgrades it; create a standalone `oh-*` skill when the capability is distinct, reusable, and not cleanly absorbed.
3. **Resolve from context** — use the codebase and prior conversation first. Ask only if a blocker cannot be resolved from either.
4. **Approval gate** — surface `merge verdict` and `action plan`. Do not edit the harness until the user approves that action.
5. **Then route** — once approved, delegate the implementation path immediately.

### Large-Codebase Verification

When the user asks to VERIFY, STUDY, CHECK, AUDIT, REVIEW, or ANALYZE a large codebase:

1. **Fire parallel readers immediately** — Spawn multiple sub-agents in parallel, each reading a different chunk of the codebase. Do NOT read files sequentially.

2. **Prioritize high-value targets** — Config files, entry points, manifests, CI, existing instruction files, and framework configs first. Source code only if architecture is still unclear after reading configs.

3. **Stop when confident** — If the parallel reads provide enough context to answer the user's question, surface findings and stop. Do not keep reading.

4. **Signal before going deeper** — If context is still insufficient after the first wave of parallel reads, tell the user: *"I still need to see more — proceed?"* with a brief note on what's still unclear and what the next scan would cover. Only continue if they say yes.
