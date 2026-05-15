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

The skill ingestion pipeline: discover external skills, evaluate signal quality, filter out noise, adapt to OH conventions, fuse multiple into one, and integrate into the harness.

Every skill you run through `oh-fusion` becomes part of the closed loop — wired into AUTOPILOT, ROUTING.md, AGENTS.md, and the self-driving engine.

## When to Use

- The user points at a skill in `.agents/skills` and says "make this OH-native"
- The user has a skill from `npx skills` ecosystem they want integrated
- The user provides raw skill content and asks "is this worth keeping?"
- Multiple skills need fusing into one (like the `oh-facade` fusion in this session)
- Any external capability needs to become an `oh-*` skill with full wiring

## Pipeline

6-phase closed loop:

```
Discovery → Analysis → Decision → Adaptation → Fusion (opt) → Integration
                                                                      ↓
                                                            oh-skills-link (verify)
```

---

## Phase 1: Discovery

Input: user's skill source
Output: raw skill content loaded for analysis

### Sources

| Source | How to access |
|---|---|
| `.agents/skills/<name>/SKILL.md` | Read the file directly |
| `npx skills` package | Run `npx skills find <query>` or check `skills.sh` |
| URL to a skill | Fetch the content via web fetch |
| User-provided path | Resolve and read |
| User-provided content inline | Capture the raw text |
| Multiple skills (for fusion) | Load all, enter Phase 2 on each |

### Discovery Checklist

Before proceeding, confirm:
- [ ] Skill content is loaded and readable
- [ ] Frontmatter is present (name, description)
- [ ] There are no access restrictions or permissions needed
- [ ] For multiple skills: all are loaded and ready for comparison

---

## Phase 2: Analysis

Input: raw skill content
Output: structured analysis report with signal score

### 2a. Depth Scoring

Measure the skill's substantive content:

| Metric | How to assess |
|---|---|
| Total lines | SKILL.md length |
| Concrete rules count | Number of "must", "never", "always", "banned" directives |
| Example count | Number of code blocks showing before/after or usage |
| Anti-patterns listed | Explicit "don't do this" sections |
| Workflow steps | Number of sequential, actionable steps |
| Routing table | Does it define pass/fail/blocker routing? |

**Scoring:**
- **High signal** (70-100): Multiple concrete rules, examples, anti-patterns, workflow steps, routing
- **Medium signal** (30-69): Some structure but thin on specifics, few examples
- **Low signal** (0-29): Vague descriptions, no concrete rules, no anti-patterns, "be creative" level

### 2b. Overlap Detection

Compare against all existing OH skills (`harness/skills/oh-*/SKILL.md`):

- Does any existing OH skill cover the same domain?
- Is the overlap partial (complementary) or complete (redundant)?
- Does the external skill have unique content OH lacks?

### 2c. Convention Check

Does the skill follow good practices?

- [ ] Has clear description for triggering
- [ ] Has concrete, actionable instructions (not just philosophy)
- [ ] Has anti-patterns or failure modes documented
- [ ] Has examples or code blocks
- [ ] Has measurable outcomes (not subjective "make it good")
- [ ] Avoids time-sensitive references (dates, version numbers)
- [ ] Avoids platform-specific assumptions that don't apply

### 2d. Report

Output a structured report:

```markdown
## Analysis: <skill-name>

**Source:** <path or origin>
**Depth score:** <0-100> — <High/Medium/Low>
**Total lines:** <N>  |  Concrete rules: <N>  |  Examples: <N>  |  Anti-patterns: <N>
**Overlap:** <existing OH skill> — <none/partial/complete>
**Verdict:** <keep / fuse / discard / ask>

**Strengths:**
- <what this skill does well>

**Weaknesses:**
- <what is missing or weak>

**Recommended action:** <port directly / fuse with X > / discard>
```

---

## Phase 3: Decision

Based on the analysis, decide what to do:

| Verdict | Action |
|---|---|
| **Keep** | High signal, no overlap, OH conventions missing. Port directly to `oh-<name>`. |
| **Fuse** | Medium-high signal, partial overlap with existing OH skill(s). Merge complementary DNA. |
| **Discard** | Low signal, complete overlap, too niche, or no actionable content. Surface reasoning. |
| **Ask** | Ambiguous quality, unclear domain fit, or user needs to choose between approaches. Surface findings. |

**Decision principles:**
- When in doubt between keep and fuse, prefer fuse — conserves routing slots and reduces surface area
- When in doubt between keep and discard, prefer keep if there is ANY unique signal — the autopilot won't load it unless triggered
- Never fuse incompatible domains (e.g., UI design into a security skill) — the result is confusing

---

## Phase 4: Adaptation

Input: raw skill content to keep/fuse
Output: OH-native SKILL.md

### 4a. Rewrite Frontmatter

```markdown
---
name: oh-<new-name>
description: "Adapted from <source>. <Core function>. Use when <triggers>."
tier: <2|3|4>
benefits-from: [<relevant oh- skills this depends on>]
triggers:
  - "<trigger phrase from original, adapted>"
  - "<new trigger phrases for OH context>"
---
```

### 4b. Structure the Body

OH skill structure:
1. **Summary** — one paragraph of what the skill does
2. **When to Use** — clear triggering context
3. **Workflow** — numbered steps (the core of the skill)
4. **Anti-patterns** — what NOT to do
5. **Routing** — pass/fail/blocker table

Adaptation rules:
- Remove all emojis from content
- Replace ecosystem-specific terminology with OH equivalents
- Convert relative paths to OH harness conventions
- Add routing table based on skill's purpose
- Keep all concrete rules, examples, and anti-patterns from the original
- Discard fluff, philosophy, and motivational language
- Preserve the original's unique signal — that's why you're importing it

### 4c. Naming

- Name must match `^[a-z0-9]+(-[a-z0-9]+)*$`
- Prefix with `oh-`
- Use the original name if it maps well, adapt if not
- For fusions: invent a new name that captures the combined purpose

---

## Phase 5: Fusion (optional — skip for single-skill imports)

Input: 2+ analyzed skill contents with "fuse" verdict
Output: one unified skill that merges complementary DNA

### 5a. Identify Complementary DNA

For each skill being fused, identify:
- **Unique rules/concepts** — content that only this skill has
- **Overlapping content** — same idea expressed differently (keep the better version)
- **Conflicting directives** — skills that say opposite things (surface to user)

### 5b. Merge Architecture

Structure the fused skill so each source contributes its strength:

```markdown
## <Combined Workflow>

### Phase A: <from skill 1>
<what skill 1 contributes>

### Phase B: <from skill 2>
<what skill 2 contributes>

### Phase C: <from skill 3>
<what skill 3 contributes>
```

Do NOT just concatenate. The fused skill must read as a single coherent workflow, not three documents glued together.

### 5c. Name the Fusion

The name should signal the combined purpose, not the individual sources.
- `oh-facade` (from redesign + design-taste + high-end-visual) — not `oh-redesign-plus-taste`
- Apply the same principle here

---

## Phase 6: Integration

Input: OH-native SKILL.md
Output: skill fully wired into the harness

### 6a. Create the Skill File

Write to `~/.config/opencode/skills/oh-<name>/SKILL.md` (user dir, survives npm updates).
If the user has an alternative preference (`~/.agents/skills/`), use that instead.
The file structure follows the standard OH skill template.

### 6b. Wire into AUTOPILOT

Add an entry to the auto-classify matrix in `harness/codex/AUTOPILOT.md`:
- Signal keywords that should trigger this skill
- Classification label
- Action: "Load **oh-<name>**. Do not ask."

### 6c. Wire routing into frontmatter

Add `route:` frontmatter to the skill — no ROUTING.md edit needed. The dynamic routing system reads `route.pass`, `route.fail`, and `route.blocker` directly from the skill's own `SKILL.md`. The skill becomes routable automatically:

```yaml
route:
  pass: <next skill or done>
  fail: <fallback skill or surface>
  blocker: surface
```

### 6d. Wire into AGENTS.md

Add to the skills table in `AGENTS.md`:
- Skill, tier, purpose
- Increment the total count

### 6e. Wire into openhermes.md

Add to the orchestrator's skill list in `harness/agents/openhermes.md`.

### 6f. Verify Discovery

Route to `oh-skills-link` to confirm the skill is discoverable by OpenCode.

---

## Routing

| Outcome | Route |
|---|---|
| integration complete | -> oh-skills-link (verify discovery) |
| fusion with iteration needed | -> oh-skill-craft (optimize via eval loop) |
| analysis: discard | -> surface findings to user |
| analysis: ask | -> surface findings + recommendations to user |
| blocker | -> surface to user |

## Anti-patterns

- Importing a skill without analyzing it first — always run Phase 2
- Keeping everything from the source — 50% of most external skills is fluff. Be ruthless.
- Fusing incompatible domains — the result confuses both the model and the user
- Naming after the source ("oh-tailwind-v2") instead of the capability ("oh-styles")
- Skipping route frontmatter — a skill without `route.pass`/`route.fail`/`route.blocker` won't auto-route
- Overwriting existing routing entries without checking for collisions
