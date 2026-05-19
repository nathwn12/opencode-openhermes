# oh-skills-list — Deep Reference

## When to Use

User wants to see available skills — lists all oh-* skills with tier and description.
Or after installing or updating skills — verify OpenCode discovers the package-local directory.

## Anti-patterns

- Filtering skills (show everything — let user decide)
- Including non-OH skills in the output
- Linking without verifying files exist
- Copying to global config during normal operation
- Overwriting user-modified skills without intent
- Linking broken/incomplete skills

## Reference

**list mode example:** User asks "what skills do you have?" → outputs a table of all oh-* skills with tier and purpose.

**verify mode example:** After running npm update, run oh-skills-list in verify mode. It reads harness/skills/, confirms config paths, reports any missing or new skills.

### Output Format

| Skill | Tier | Purpose |
|-------|------|---------|
| oh-\<name\> | 2/3/4 | \<description\> |
