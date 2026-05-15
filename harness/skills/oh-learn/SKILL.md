---
name: oh-learn
description: "Extract, evolve, and promote session learnings as instincts. Review, search, prune, export."
tier: 2
triggers:
  - "learn from session"
  - "extract patterns"
  - "run oh-learn"
route:
  pass: done
  fail: surface
  blocker: surface
---

# oh-learn

Learning engine for the harness. Distills patterns from sessions into **instincts** (trigger-action pairs with confidence), clusters them into skill candidates, and graduates high-signal patterns from project to global scope.

## Instinct Data Model

Every learning stored as one JSONL line in `~/.local/share/opencode/openhermes/plans/<project-name>-instincts.jsonl`:

```json
{ "trigger": "situation pattern", "action": "recommended response", "confidence": 0.5, "applications": 1, "successes": 1, "category": "coding", "source": "oh-learn:extract", "ts": "2026-05-15T12:00:00Z" }
```

**Rules:**
- **Trigger** — specific, matchable situation. *Not* general advice.
- **Action** — executable response. *Not* a belief.
- **Confidence** — starts at 0.5, increments +0.05 per successful application, decays -0.02 per day without use.
- **Category** — one of: `coding`, `testing`, `security`, `git`, `planning`, `orchestration`, `debugging`, `ux`.

## When to Use

After completing a significant piece of work, at session handoff, or when you notice the same pattern repeat 2+ times in one session. Also on explicit user request.

## Workflows

### Extract
Mine the current session for reusable patterns.

1. Scan recent conversation + code changes for repeated decision patterns
2. For each distinct pattern write an instinct: trigger, action, confidence=0.5, category
3. Read existing `~/.local/share/opencode/openhermes/plans/<project-name>-instincts.jsonl`, check for near-duplicate triggers
4. If duplicate found: merge — `confidence = max(existing, 0.8 × new)`, increment applications
5. If new: append line to file

**Good instinct:** trigger=`"tsc --noEmit shows 10+ errors after batch edit"`, action=`"Fix errors one at a time, re-running tsc after each, rather than batch-fixing"`, category=`"debugging"`

**Bad instinct:** `"Write clean code"` — too vague to trigger on.

### Evolve
Cluster related instincts into skill/command/agent candidates.

1. Read all instincts from `~/.local/share/opencode/openhermes/plans/<project-name>-instincts.jsonl`
2. Group by `category`, then by trigger topic similarity
3. **If cluster ≥ 5 instincts AND avg confidence ≥ 0.7** → generate `oh-skill-craft` spec for a new skill
4. **If cluster 3-4 instincts with confidence ≥ 0.8** → suggest update to existing skill
5. Output candidate summary with trigger list and extracted core pattern

### Promote
Graduate high-confidence instincts from project to global scope.

1. Scan `~/.local/share/opencode/openhermes/plans/<project-name>-instincts.jsonl` for instincts with `confidence >= 0.85 AND applications >= 10`
2. Filter out project-specific patterns (reference paths, local APIs, domain terms)
3. Append filtered candidates to `%USERPROFILE%\.config\opencode\instincts.jsonl` (global)
4. Tag promoted instincts with `"promoted": true` in project file
5. Report: "Promoted N instincts to global scope"

### Review
Show instinct summary: total count, confidence distribution, category breakdown, recently promoted.

### Search
Find instincts by topic, trigger fragment, category, or confidence range.

### Prune
Remove instincts stale for 30+ days with confidence < 0.3, or superseded by a higher-confidence instinct covering the same trigger.

### Export
Serialize instincts to portable JSON for sharing across projects or teams:

```json
{ "version": 1, "exported": "2026-05-15T12:00:00Z", "instincts": [...] }
```

## Anti-patterns

- Hoarding every observation (most things aren't learnings)
- Never pruning (stale knowledge is worse than no knowledge)
- Storing what, not why (context-less facts are forgettable)
- Over-promoting: not every pattern is globally useful
- Extracting without applying: instincts that never trigger are noise
- Ignoring confidence: treating all instincts as equally reliable

## Routing

| Outcome | Route |
|---------|-------|
| pass | → [done — report summary] |
| fail | → [surface gaps to user] |
| blocker | → surface to user |
