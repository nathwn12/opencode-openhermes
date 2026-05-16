# oh-skills-link — Deep Reference

## When to Use

After installing or updating skills. Verify OpenCode discovers the package-local directory.

## Anti-patterns

- Linking without verifying files exist
- Copying to global config during normal operation
- Overwriting user-modified skills without intent
- Linking broken/incomplete skills

## Reference

**Example:** After running npm update, run oh-skills-link. It reads harness/skills/, confirms config paths, reports any missing or new skills.
