---
name: oh-expert
description: "AI-expert built-in: shared vocabulary for self-diagnosis, failure modes, attention dynamics, and working patterns"
tier: 2
triggers:
  - "why did you get that wrong"
  - "diagnose yourself"
  - "are you sure"
  - "stop agreeing with me"
  - "sycophancy"
  - "hallucination"
  - "attention"
  - "smart zone"
route:
  pass:
    - oh-builder
    - oh-gauntlet
  fail: oh-expert
  blocker: surface
---

# oh-expert

Shared AI-coding vocabulary for agent self-diagnosis. Every failure mode maps to a specific cause and fix. Use this vocabulary precisely — vague terms ("hallucination" alone, "wrong") have no diagnostic value.

## Failure Modes

### Sycophancy
Confidently agreeable output. The model was trained to favor answers humans liked — agreement is rewarded even when wrong.

**Surfaces as:**
- Caving under pushback — reverses a correct answer when you say "are you sure?"
- Praising bad input — agrees a broken plan is brilliant before analyzing it
- Biased framing — review skews positive when you signal authorship
- Mimicry — repeats your mistakes back as confirmation

**Diagnostic test:** Would I have said this without the user's steer? If only tone/framing changed, it is sycophancy.

**Fix:** Hide your preferences. Re-ask neutrally — "review this code" not "is this code good?"

### Hallucination (two flavors)
Confidently-wrong output. Two flavors with different causes and fixes:

- **Factuality hallucination** — invented/wrong facts (fake function, wrong API, fake citation). Caused by parametric knowledge gaps. Fix: load contextual knowledge (read docs, read the file).

- **Faithfulness hallucination** — output drifts from loaded context, user instructions, or own prior reasoning. Symptom of attention degradation. Fix: clear or compact.

**Avoid:** "Hallucination" as bare synonym for "wrong" — without naming the flavor the term has no diagnostic value.

### Attention Degradation
As a session grows, each token's attention budget spreads across more competitors. Signal on meaningful relationships shrinks; noise from irrelevant context crowds in.

**Surfaces as:** The smart zone → dumb zone drift. Inventing generics not in the type file. Ignoring schema pasted at the top.

**Fix:** Clear and reload. Do NOT add more docs — the problem is not missing information, it is buried signal.

### Smart Zone / Dumb Zone
Early in a session the agent is sharp and focused (smart zone). As session grows it drifts into a dumb zone: sloppier, forgetful, more faithfulness hallucinations.

**Threshold:** On frontier models, the dumb zone commonly begins around 100k tokens.

**Self-diagnosis cue:** "It nailed the first three components and butchered the fourth" = out of smart zone.

**Fix:** Clear or compact. Do not push through.

### Non-determinism
Same input can produce different output. A property of how models generate text. No setting to disable it.

**Self-diagnosis cue:** "The model has been awful today" → probably not a worse version, just the distribution. Try again tomorrow.

**Avoid:** Over-narrativizing. A string of bad runs is not proof something changed.

### Knowledge Cutoff
The date past which a model has no parametric knowledge. Post-cutoff libraries/APIs are fabrication traps.

**Self-diagnosis cue:** "It keeps writing v3 SDK syntax — we are on v5." → v5 shipped after cutoff. Load current docs.

## Working Patterns

### Progressive Disclosure
AGENTS.md pays token cost every turn. Put infrequently used instructions behind context pointers (skills).

### Handoff
Transferring context from one session to another with no return path. Use when: planning session is getting heavy, role switching, kicking off AFK runs. Always write a structured artifact.

### Compaction
A handoff done in-memory: previous session is summarized and seeds a fresh session. Lossy — detail traded for headroom. Compact manually to control what is kept.

### Subagent
An agent spawned by another agent via tool call. Runs in own session with own context window. Reports a single result back. Cannot spawn further subagents (one level deep). Use to isolate context.

### Skill vs Tool
- **Skill**: instructions the agent reads (loaded on demand)
- **Tool**: function the agent calls (always available)
Do not confuse them.

## Diagnostic Map

| Symptom | Likely Cause | First Move |
|---|---|---|
| Reverses answer under pushback | Sycophancy | Re-ask neutrally, hide preference |
| Invents things in the loaded doc | Faithfulness hallucination / attention degradation | Clear or compact |
| Invents things not in any doc | Factuality hallucination / parametric gap | Load relevant docs |
| Sharp early, sloppy late | Smart zone → dumb zone drift | Compact, do not push through |
| Different results same input | Non-determinism (normal) | Try again |
| Writes old API syntax | Knowledge cutoff | Load current docs |
| Agrees with bad ideas | Sycophancy | Phrase prompts neutrally |
| Ignores context at top of window | Attention budget exhausted | Clear or move critical context closer |

## Avoid These Terms (imprecise or wrong)

| Instead of | Use |
|---|---|
| "Hallucination" alone | Factuality hallucination or faithfulness hallucination |
| "Sycophancy" for any pleasing wrong answer | Only when diagnostic test confirms |
| "Tool" for a skill | Skill = instructions read; Tool = function called |
| "Memory" (for context window) | Context window |
| "Working memory" | Contextual knowledge |
| "Background agent" | AFK |

## Routing

| Outcome | Route |
|---------|-------|
| pass | → oh-builder (implement fix) or oh-gauntlet (re-test) |
| fail | → oh-expert (re-diagnose — load fresh context) |
| blocker | → surface to user |
