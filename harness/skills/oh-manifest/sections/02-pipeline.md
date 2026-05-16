# Pipeline

## Step 1: Plan
If plan exists, load. If not, run oh-planner. Auto-decide minor scope via decision principles. Surface only: premises needing human judgment, or plan/alternative conflicts.

## Step 2: Build
Run oh-builder for each plan phase in dependency order. Parallelizable phases → sub-agents. Auto-decide implementation choices.

**Two-stage review (in order — never reverse):**
1. **Spec compliance first** — Does the output match the plan/spec requirements? Quote the spec. No scope creep, no missing requirements.
2. **Code quality second** — Only after spec compliance is ✅. Architecture, readability, test quality, edge cases.

**Implementer status protocol** — Implementers report one of:

| Status | Action |
|--------|--------|
| **DONE** | Proceed to spec review |
| **DONE_WITH_CONCERNS** | Read concerns before proceeding |
| **NEEDS_CONTEXT** | Provide context, re-dispatch |
| **BLOCKED** | Assess: context problem? capability gap? task too large? plan wrong? |

Never ignore BLOCKED or retry same approach without changes.

### Step 3: Verify
Check each phase against verification criteria. Tests pass → mark complete. Fail → diagnose (oh-expert), fix, re-verify.

### Step 4: Loop
All done → DONE. Phase fails → BLOCKER (surface). New work discovered → add to plan, continue.
