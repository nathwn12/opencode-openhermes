# Description Optimization

After the skill body is solid, optimize its `description` field for triggering accuracy. The description is what the routing system uses to match queries to skills.

## Process

### 1. Create 20 Eval Queries

Construct a balanced eval set:

| Type | Count | Purpose |
|------|-------|---------|
| **Should-trigger** | 10 | Different phrasings and contexts where this skill is the correct answer |
| **Should-not-trigger** | 10 | Near-misses that share keywords but need a different skill |

### 2. Quality Rules

- Queries must be **realistic** — phrases users actually type, not academic exercises
- Include **concrete details** — "create a skill for validating YAML configs" not "make a skill"
- Should-not-trigger queries should be **genuinely confusable** — if they're obviously unrelated, the test is useless

### 3. Iterate Description

Write candidate descriptions. For each candidate:
- Score it against the eval set
- How many should-trigger queries does it catch?
- How many should-not-trigger does it correctly reject?
- Tune phrasing, keywords, and structure

### 4. Select Winner

The description with the best precision/recall balance wins. Record it in the skill frontmatter.
