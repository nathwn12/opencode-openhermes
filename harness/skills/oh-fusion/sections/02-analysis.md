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
