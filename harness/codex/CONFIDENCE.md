# OpenHermes Confidence Gate

The confidence gate sits between Phase 0 (Shell Pre-Flight) and Auto-Classify. It evaluates signal confidence in the user's request to determine whether to skip, echo, or ask before classifying.

## Purpose

Prevents premature delegation by ensuring the orchestrator understands the task before firing sub-agents. Eliminates blanket "Do not ask" rules — replaces them with calibrated permission to ask when appropriate.

The gate is:
- **Bounded** — 1 conversational exchange max, not a discussion
- **Optimistic** — defaults to delegate, not to ask
- **Transparent for clear requests** — high confidence tasks have zero overhead
- **Failsafe** — no answer on low confidence → safe fallback to oh-planner

## Confidence Levels

### HIGH — Transparent Gate

Skip the gate entirely. Proceed directly to Auto-Classify. Zero conversation latency.

**Signals:**
- Single clear domain keyword: "bug", "security", "deploy", "review", "test", "refactor", "design", "ship", "plan", "build"
- Known command invocation: `/oh-doctor`, `/oh-log`
- Well-defined task pattern: "build X", "implement Y", "fix Z in file", "run tests on A"
- Concrete file/function reference: "in auth.ts", "the login component", "in main.go"
- 1-3 sentences with clear domain vocabulary and deliverable

**Example triggers:**
- "There's a bug in the login flow"
- "Deploy this to production"
- "Run the test suite for the auth module"
- "Build a dropdown component with loading states"
- "Review PR #42"
- "Ship version 4.2.0"

**Behavior:** None. Zero conversational overhead. Proceed directly to Auto-Classify.

---

### MEDIUM — Echo Gate

One-liner echo to confirm understanding. User responds briefly, then the orchestrator classifies.

**Signals:**
- Multi-domain request: "build the UI and fix the bug"
- Semi-vague: "make the app better", "clean things up", "improve performance"
- Mixed signals spanning two classification categories
- Request that could be interpreted multiple valid ways
- Incomplete context: "fix it" without specifying what "it" is

**Conversation templates:**
- "I hear [summary]. Routing to [skill] — does that match what you need?"
- "Sounds like [classification] work. Correct?"
- "Quick check — is this about [X] or [Y]?"

**Example conversation:**
> User: "Clean up the codebase and make it faster"
> Orchestrator: "I hear performance improvements + code cleanup. Routing to oh-planner for a plan first — does that match what you need?"
> User: "Yes" → Auto-Classify
> User: "No, actually just run lint" → Re-classify to oh-health

**Behavior:** One confirmation round. User confirms → classify. User corrects → re-analyze and classify.

---

### LOW — Question Gate

One targeted question. On answer → classify and delegate. No answer within the exchange → default to oh-planner.

**Signals:**
- Very vague: "I have an idea", "help me with something", "what should I do about"
- Contradictory signals where no primary category dominates
- Outside the classification matrix entirely
- Open-ended with no clear deliverable
- Single word: "help", "ideas", "thoughts"?

**Conversation templates:**
- "Quick one — is this about [A], [B], or something else entirely?"
- "Are we building something new, fixing something broken, or exploring an idea?"
- "I'm not sure I have enough to go on. One question: [specific question]?"

**Example conversation:**
> User: "I have an idea for the app"
> Orchestrator: "Quick one — is this about a new feature, a redesign, or something else?"
> User: "A new feature" → Classify as PLANNING NEEDED → oh-planner
> (No response) → Default to oh-planner (safe fallback)

**Behavior:** One targeted question. On answer → classify. No clear answer → oh-planner.

---

## Signal Detection Guidelines

When parsing user input, evaluate these axes:

| Axis | High | Medium | Low |
|---|---|---|---|
| **Domain vocabulary** | Present and specific | Present but broad | Absent or generic |
| **Deliverable clarity** | Concrete outcome | Vague outcome | No outcome stated |
| **Scope** | Narrow, bounded | Moderate, fuzzy | Wide open |
| **Ambiguity** | 0-1 interpretations | 2-3 interpretations | 4+ interpretations |
| **File/function reference** | Specific | General area | None |
| **Domain count** | Single domain | 1-2 domains | 2+ domains or unclear |

### Axis Priority Rules for Mixed Signals

When signal axes disagree (some HIGH, some LOW), evaluate in this priority order:

| Priority | Axis | Why |
|---|---|---|
| 1 | **Domain vocabulary** | Best predictor of correct classification. A clear domain keyword with vague scope can still route to the right skill. |
| 2 | **Deliverable clarity** | Second most predictive. A concrete outcome with a generic domain keyword suggests user knows what they want but not our vocabulary. |
| 3 | **File/function reference** | Specific reference indicates precise context even if deliverable is vague. |
| 4 | **Scope** | Useful for narrowing but not determinative alone. |
| 5 | **Ambiguity** | Interpretations count is a useful signal but can misclassify complex-but-clear requests. |
| 6 | **Domain count** | Multi-domain requests are common and not inherently low-confidence. |

**Tiebreaking rules:**
1. If Priority 1 (domain vocabulary) is HIGH, treat the overall confidence as HIGH — unless Priority 2 (deliverable clarity) is explicitly LOW (not just MEDIUM).
2. If Priority 1 is MEDIUM and Priority 2 is HIGH, treat as MEDIUM (echo) — the user knows the outcome but not the skill category.
3. If Priority 1 is HIGH, Priority 2 is MEDIUM, and no axis scores LOW → treat as HIGH.
4. If any axis scores LOW and no axis scores HIGH → treat as LOW.
5. If the tiebreaking rules still leave uncertainty → fall back to the conservative "choose lower confidence" rule.

If uncertain between two levels, choose the more conservative one (lower confidence). It is better to waste one exchange confirming than to fire the wrong skill.

## Bounded Exchange Rule

| Level | Max Exchanges | Behavior |
|---|---|---|
| HIGH | 0 | Proceed directly |
| MEDIUM | 1 | Echo → confirm → classify |
| LOW | 1 | Question → answer → classify |

After the exchange, classify and delegate immediately. Do not continue the conversation. If the user tries to expand the conversation, acknowledge briefly and route: "Got it. Classifying now."

## Fallback Rule

If LOW confidence question receives no clear answer (user doesn't respond, responds with more vagueness, or changes topic):
- Classify as PLANNING NEEDED
- Route to oh-planner (Mode A brainstorm)
- The planner's 6 clarifying questions will surface the real need
- This is a safe fallback — the planner handles ambiguity gracefully

## Flow Diagram

```
User input
    │
    ▼
Phase 0: Shell Pre-Flight
    │
    ▼
Phase 0.5: Confidence Gate ◄─── CONFIDENCE.md
    │
    ├── HIGH (transparent)
    │   └──→ Auto-Classify immediately
    │
    ├── MEDIUM (echo)
    │   └──→ "I hear X. Routing to Y?"
    │       ├── Yes → Auto-Classify
    │       └── No  → Re-analyze → Auto-Classify
    │
    └── LOW (question)
        └──→ One question
            ├── Answer → Auto-Classify
            └── No answer → oh-planner (safe fallback)
    │
    ▼
Auto-Classify → Load Skill → Delegate
```

## Relationship to Other Docs

| Document | Role |
|---|---|
| `CONFIDENCE.md` | Defines the confidence evaluation protocol (this file) |
| `AUTOPILOT.md` | Contains the phases. Phase 0.5 references this doc. |
| `openhermes.md` | The primary agent prompt. Task Flow incorporates the confidence gate. |
| `CONSTITUTION.md` | Article 15 anchors the principle: "Talk before delegate." |
| `ROUTING.md` | Question Gate updated to reference confidence check. |

## Anti-patterns

- **Over-conversation** — Asking more than one question. The gate is bounded to 1 exchange.
- **Asking when you know** — Using MEDIUM/LOW when signals are clearly HIGH. Be generous with HIGH confidence.
- **Stalling** — Not classifying after the exchange. Always classify and delegate.
- **Delegating the conversation** — Handing the conversation to a sub-agent. The orchestrator handles the gate itself.
- **Ignoring the fallback** — Sitting silently when LOW gets no answer. Default to oh-planner.
