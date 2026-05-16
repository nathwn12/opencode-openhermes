# oh-expert — Deep Reference

## When to Use

Agent is getting things wrong, reversing answers under pushback, hallucinating, drifting from instructions, or showing signs of attention degradation. "Hallucination" alone has no diagnostic value — always classify the specific flavor.

## Anti-patterns

- Using "hallucination" without classifying factuality vs faithfulness
- Adding more docs when attention is degraded (problem is buried signal, not missing info)
- Calling any agreeable wrong answer "sycophancy" without running the diagnostic test
- Pushing through smart zone drift instead of compacting

## Failure Modes

### Sycophancy

Model favors agreeable answers — agreement rewarded even when wrong.

**Signals:** Caves under pushback ("are you sure?" → reverses correct answer). Praises bad input. Framing skews positive when you signal authorship. Mimics your mistakes as confirmation.

**Diagnostic test:** "Would I say this without user steer?" If tone/framing shaped the answer → sycophancy.

**Fix:** Hide preferences. Re-ask neutrally.

### Hallucination (two flavors)

- **Factuality** — invented facts (fake functions, wrong API, fake citations). Cause: parametric knowledge gap. Fix: read current docs/files.
- **Faithfulness** — drifts from loaded context/user instructions. Cause: attention degradation. Fix: clear or compact.

### Attention Degradation

As session grows, token attention spreads across more competitors. Signal shrinks, noise crowds in.

**Signals:** Smart → dumb zone drift. Invents generics not in types. Ignores schema pasted at top.

**Fix:** Clear and reload. Do NOT add more docs — problem is buried signal, not missing info.

### Smart Zone / Dumb Zone

Sharp (early session) → sloppy (~100k tokens, frontier models). Self-diagnosis: "nailed the first three, butchered the fourth" = out of smart zone.

**Fix:** Clear or compact. Do not push through.

### Non-determinism

Same input, different output. Normal. No setting to disable.

**Signal:** "Model has been awful today" — probably distribution, not a worse version.

### Knowledge Cutoff

No parametric knowledge past cutoff date. Post-cutoff APIs → fabrication traps.

**Signal:** "Keeps writing v3 SDK — we're on v5." Fix: load current docs.

## Working Patterns

- **Progressive Disclosure** — AGENTS.md costs tokens every turn. Infrequent instructions behind skills.
- **Handoff** — structured artifact for session transfer (no return path).
- **Compaction** — in-memory handoff. Lossy but frees headroom.
- **Subagent** — spawned agent in own session. One level deep. Reports one result.
- **Skill vs Tool** — Skill = instructions (loaded on demand). Tool = function (always available).

## Diagnostic Map

| Symptom | Cause | First Move |
|---------|-------|------------|
| Reverses answer under pushback | Sycophancy | Re-ask neutrally |
| Invents things in loaded doc | Faithfulness hallucination | Clear or compact |
| Invents things not in any doc | Factuality hallucination | Load relevant docs |
| Sharp early, sloppy late | Smart zone drift | Compact |
| Different results same input | Non-determinism | Try again |
| Writes old API syntax | Knowledge cutoff | Load current docs |
| Ignores top-of-window context | Attention exhausted | Clear or move context closer |

## Avoid These Terms

| Instead of | Use |
|------------|-----|
| "Hallucination" alone | Factuality or faithfulness hallucination |
| "Sycophancy" for any pleasing wrong | Only when diagnostic test confirms |
| "Tool" for a skill | Skill = instructions; Tool = function |
| "Memory" (context window) | Context window |
| "Background agent" | AFK |
