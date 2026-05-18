# oh-fusion — Deep Reference

## When to Use

Use when a user wants to bring an external skill or capability into the OpenHermes harness as an OH-native skill.

## Phase 1: Discovery

| Source | Access |
|--------|--------|
| `.agents/skills/<name>/SKILL.md` | Read file |
| `npx skills` package | `npx skills find <query>` |
| URL | Fetch content |
| User path | Resolve and read |
| Inline text | Capture raw |

Confirm: content loaded, frontmatter present, no access restrictions. For multiple: all loaded.

## Phase 2: Analysis

### Required Lenses

Analyze every source through these lenses:

- **OH gaps** — what OH does not currently cover, or covers weakly
- **OH wins** — where OH already outperforms the source and should not regress
- **Missed patterns** — reusable patterns the source surfaces that OH should absorb
- **Overlap target** — the strongest existing `oh-*` candidate for merge, if any

### Merge Rubric

Choose one verdict:

| Verdict | Use when |
|---------|----------|
| Merge | The source upgrades an existing OH capability more than it defines a new one |
| Standalone | The source adds a distinct capability with its own trigger, workflow, and routing needs |
| Discard | The source is redundant, weak, or anti-native |

### Strength Check

Reject or rewrite any protocol that makes OH weaker, slower, noisier, or less OpenCode-native.

### Fusion Report Template
```markdown
## OH gaps
- ...

## OH wins
- ...

## Missed patterns
- ...

## Merge verdict
- Verdict: <merge | standalone | discard>
- Target: <existing oh-* or new oh-*>
- Why: <short rationale>

## Action plan
1. ...
2. ...

## Approval gate
- Status: pending approval
- Next move after approval: <skill/action>
```

## Phase 3: Decision

Default to `merge` when the source sharpens an existing OH workflow. Default to `standalone` only when the capability stays clean, distinct, and reusable after removing overlap.

## Phase 4: Adaptation

### Frontmatter
```yaml
name: oh-<name>
description: "Adapted from <source>. Core function. Use when ..."
tier: <2|3|4>
```

### Body Structure
1. **Summary** — one short paragraph
2. **When to Use** — clear triggering context
3. **Protocol** — numbered workflow
4. **Rubric / guardrails** — what to merge, reject, or escalate
5. **Routing** — pass/fail/blocker table

### Adaptation Rules
- Remove emojis. Replace ecosystem terms with OH equivalents.
- Convert relative paths to OH harness conventions.
- Add routing table based on the skill's purpose.
- Keep all concrete rules, examples, and anti-patterns from the original.
- Discard fluff, philosophy, and motivational language.
- Preserve the original's unique signal — that's why you're importing it.
- Keep the result OpenCode/OpenHermes-native only.

### Naming
Match `^[a-z0-9]+(-[a-z0-9]+)*$`, prefix `oh-`. Original name if good fit, adapt if not. Fusion names signal combined purpose.

## Phase 5: Approval Gate

Before any harness mutation, surface the fusion report and wait for approval. Approved intent already present in the conversation counts. Do not ask new questions unless a blocker cannot be resolved from the codebase or prior conversation.

## Phase 6: Fusion (opt — skip for single imports)

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

## Phase 7: Integration

1. **Create file** → user dir (`~/.config/opencode/skills/oh-<name>/SKILL.md`)
2. **Wire AUTOPILOT** → add to auto-classify matrix in `harness/codex/AUTOPILOT.md`: signal keywords → classification → "Load **oh-<name>**. Do not ask."
3. **Wire routing** → add `route:` frontmatter in the skill. Dynamic loading reads `route.pass`, `route.fail`, `route.blocker` directly from `SKILL.md` — no ROUTING.md edit needed. Skill becomes routable automatically.
4. **Wire AGENTS.md** → add to skills table with tier and purpose. Increment total count.
5. **Wire openhermes.md** → add to orchestrator's skill list in `harness/agents/openhermes.md`.
6. **Verify** → route to `oh-skills-link` to confirm OpenCode discovers it.

## Anti-patterns

- Importing without analysis (always run Phase 2)
- Asking before checking code or prior conversation
- Changing the harness before the approval gate clears
- Keeping everything — most external skill text is fluff
- Fusing incompatible domains (confusing to model and user)
- Naming after source ("oh-tailwind-v2") instead of capability ("oh-styles")
- Skipping route frontmatter — without it, autopilot can't route
- Overwriting existing routing without checking for collisions
- Shipping a protocol that weakens OH or makes it less native
