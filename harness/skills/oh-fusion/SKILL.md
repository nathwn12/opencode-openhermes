---
name: oh-fusion
description: "Skill ingestion pipeline: discover, analyze, filter, adapt, fuse, and integrate external skills into the OH harness. Use when the user has an existing skill, finds a skill in their .agents/skills, or wants to bring an external capability into OH."
tier: 3
benefits-from: [oh-skill-craft, oh-skills-link, oh-expert]
triggers:
  - "import skill"
  - "ingest skill"
  - "fuse skill"
  - "merge skills"
  - "port skill"
  - "add skill from"
  - "make this OH-native"
  - "skill fusion"
  - "oh-fusion"
  - "integrate skill"
  - "convert skill"
  - "bring in a skill"
  - "transfer skill"
  - "copy skill"
  - "adopt skill"
route:
  pass:
    - oh-skills-link
    - oh-skill-craft
  fail: oh-skill-craft
  blocker: surface
---

# oh-fusion

Skill ingestion pipeline: Discover → Analyze → Decide → Adapt → Fuse (opt) → Integrate. Every fused skill wires into AUTOPILOT, ROUTING, and the self-driving engine.

---

## Phase 1: Discovery

Input: user's skill source. Output: raw content loaded.

| Source | Access |
|--------|--------|
| `.agents/skills/<name>/SKILL.md` | Read file |
| `npx skills` package | `npx skills find <query>` |
| URL | Fetch content |
| User path | Resolve and read |
| Inline text | Capture raw |

Confirm: content loaded, frontmatter present, no access restrictions. For multiple: all loaded.

---

## Phase 2: Analysis

Input: raw skill. Output: structured report with signal score.

### Depth Scoring
| Metric | Assessment |
|--------|-----------|
| Lines | SKILL.md length |
| Concrete rules | "must/never/always/banned" count |
| Examples | Before/after or usage code blocks |
| Anti-patterns | Explicit "don't" sections |
| Workflow steps | Sequential, actionable steps |
| Routing table | pass/fail/blocker defined |

**Score:** High (70-100) = concrete + examples + routing. Medium (30-69) = some structure. Low (0-29) = vague, no rules.

### Overlap Detection
Compare against existing `harness/skills/oh-*` skills. Overlap: none / partial (complementary) / complete (redundant).

### Convention Check
- Clear description for triggering? Actionable instructions? Anti-patterns? Examples? Measurable outcomes? No time-sensitive refs? No platform assumptions?

### Report Template
```markdown
**Depth:** <0-100> — <High/Medium/Low>
**Overlap:** <existing skill> — <none/partial/complete>
**Verdict:** <keep / fuse / discard / ask>
**Action:** <port directly / fuse with X / discard>
```

---

## Phase 3: Decision

| Verdict | Action |
|---------|--------|
| Keep | High signal, no overlap. Port to `oh-<name>`. |
| Fuse | Partial overlap with existing. Merge complementary DNA. |
| Discard | Low signal or complete overlap. Surface reasoning. |
| Ask | Ambiguous quality. Surface findings. |

When in doubt: prefer fuse over keep, keep over discard if ANY unique signal.

---

## Phase 4: Adaptation

Input: content to keep/fuse. Output: OH-native SKILL.md.

### Frontmatter
```yaml
name: oh-<name>
description: "Adapted from <source>. Core function. Use when ..."
tier: <2|3|4>
```

### Body Structure
1. **Summary** — one-paragraph of what the skill does
2. **When to Use** — clear triggering context
3. **Workflow** — numbered steps (the core)
4. **Anti-patterns** — what NOT to do
5. **Routing** — pass/fail/blocker table

### Adaptation Rules
- Remove emojis. Replace ecosystem terms with OH equivalents.
- Convert relative paths to OH harness conventions.
- Add routing table based on the skill's purpose.
- Keep all concrete rules, examples, and anti-patterns from the original.
- Discard fluff, philosophy, and motivational language.
- Preserve the original's unique signal — that's why you're importing it.

### Naming
Match `^[a-z0-9]+(-[a-z0-9]+)*$`, prefix `oh-`. Original name if good fit, adapt if not. Fusion names signal combined purpose.

---

## Phase 5: Fusion (opt — skip for single imports)

For each skill being fused, identify:
- **Unique concepts** — content only this skill has
- **Overlapping content** — same idea expressed differently (keep the better version)
- **Conflicting directives** — skills that say opposite things (surface to user)

### Merge Architecture
Structure so each source contributes its strength. Do NOT concatenate — must read as one coherent workflow, not three documents glued together.

```markdown
## Combined Workflow
### Phase A: <from skill 1>
### Phase B: <from skill 2>
```

### Naming
Name signals combined purpose, not individual sources. E.g., `oh-facade` from redesign + design-taste + high-end-visual, not `oh-redesign-plus-taste`.

---

## Phase 6: Integration

1. **Create file** → user dir (`~/.config/opencode/skills/oh-<name>/SKILL.md`)
2. **Wire AUTOPILOT** → add to auto-classify matrix in `harness/codex/AUTOPILOT.md`: signal keywords → classification → "Load **oh-<name>**. Do not ask."
3. **Wire routing** → add `route:` frontmatter in the skill. Dynamic loading reads `route.pass`, `route.fail`, `route.blocker` directly from `SKILL.md` — no ROUTING.md edit needed. Skill becomes routable automatically.
4. **Wire AGENTS.md** → add to skills table with tier and purpose. Increment total count.
5. **Wire openhermes.md** → add to orchestrator's skill list in `harness/agents/openhermes.md`.
6. **Verify** → route to `oh-skills-link` to confirm OpenCode discovers it.

---

## Anti-Patterns

- Importing without analysis (always run Phase 2)
- Keeping everything — ~50% of external skills is fluff
- Fusing incompatible domains (confusing to model and user)
- Naming after source ("oh-tailwind-v2") instead of capability ("oh-styles")
- Skipping route frontmatter — without it, autopilot can't route
- Overwriting existing routing without checking for collisions

## Routing

| Outcome | Route |
|---------|-------|
| Integration complete | → oh-skills-link (verify discovery) |
| Fusion needs iteration | → oh-skill-craft |
| Analysis: discard | → surface |
| Analysis: ask | → surface with recs |
| Blocker | → surface |
