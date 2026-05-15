## Phase 6: Integration

1. **Create file** → user dir (`~/.config/opencode/skills/oh-<name>/SKILL.md`)
2. **Wire AUTOPILOT** → add to auto-classify matrix in `harness/codex/AUTOPILOT.md`: signal keywords → classification → "Load **oh-<name>**. Do not ask."
3. **Wire routing** → add `route:` frontmatter in the skill. Dynamic loading reads `route.pass`, `route.fail`, `route.blocker` directly from `SKILL.md` — no ROUTING.md edit needed. Skill becomes routable automatically.
4. **Wire AGENTS.md** → add to skills table with tier and purpose. Increment total count.
5. **Wire openhermes.md** → add to orchestrator's skill list in `harness/agents/openhermes.md`.
6. **Verify** → route to `oh-skills-link` to confirm OpenCode discovers it.
