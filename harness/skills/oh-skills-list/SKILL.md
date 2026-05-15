---
name: oh-skills-list
description: "List all available oh-* skills with descriptions"
triggers:
  - "list skills"
  - "show skills"
  - "what skills"
---

# oh-skills-list

## When to Use
To discover what skills are available. Lists every skill with its name, description, and category.

## Output
Markdown table of skills:

| Skill | Description | Category |
|-------|-------------|----------|
| oh-plan | Strategy + architecture review | Orchestration |
| oh-qa | Full QA workflow | Quality |
| ... | ... | ... |

## Anti-patterns
- Listing "all available" but missing recently installed skills
- Showing skill file paths instead of human-readable descriptions
- Not categorising skills (flat list is hard to scan)

## Routing

| Outcome | Route |
|---------|-------|
| pass | → [done — read-only report] |
| fail | → [surface issue to user] |
| blocker | → surface to user |
