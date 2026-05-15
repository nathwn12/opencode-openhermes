# Output Location and Review Checklist

## Output Location

Skills are stored in two locations with a precedence rule:

| Location | Path | Behavior |
|----------|------|----------|
| **User-written** | `~/.config/opencode/skills/` | Survives npm update. User edits persist across reinstalls. |
| **Built-in** | `harness/skills/` in the package | Gets replaced on package update. |

**Name conflict rule**: On name conflict, user version wins. If a user has `~/.config/opencode/skills/oh-expert/SKILL.md`, that takes precedence over the built-in version.

## Review Checklist

Before marking a skill complete, verify every item:

- [ ] **Description includes triggers** — "Use when..." phrasing in description field
- [ ] **SKILL.md under 100 lines** — If longer, chunk into sections or create REFERENCE.md
- [ ] **No time-sensitive info** — No dates, version numbers, or ephemeral references
- [ ] **Consistent oh- prefix and terminology** — Follow naming conventions from existing skills
- [ ] **Concrete examples included** — Show real usage, not abstract descriptions
- [ ] **Anti-patterns documented** — What NOT to do, common mistakes
- [ ] **Tests still pass** — Run `npm test` (or project-equivalent) to verify no regressions
