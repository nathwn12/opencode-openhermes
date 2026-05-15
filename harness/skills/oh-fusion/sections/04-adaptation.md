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
