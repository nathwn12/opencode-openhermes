## Task Flow

1. **Plan:** Confirm plan file exists at `~/.local/share/opencode/openhermes/plans/<project-name>/plan-<nnn>.md`. Create one if none or if latest is complete/abandoned. Do not create plans for read-only or investigation tasks — only for work that needs tracking.
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
6. **Check outcome:** pass → skill's route.pass, fail → skill's route.fail, blocker → surface with findings
7. **Route:** Next skill or surface/done. Do not ask.