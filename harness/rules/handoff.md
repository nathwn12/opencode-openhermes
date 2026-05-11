# Agent Handoff System

Structured protocol for agents to delegate work to the right subagent. Read this before delegating.

## Core Principle: Act or Delegate

Every agent must answer: **"Am I the right agent for this?"**

| If... | Then... |
|-------|---------|
| Task matches your role and you have permission | Do it directly |
| Task matches but is complex | Plan first, then execute |
| Task partly matches yours | Do your part, delegate the rest |
| Task does NOT match your role | Delegate entirely |
| You lack permission for an action | Delegate to agent with permission |
| You're a review/planning agent asked to edit | **Must delegate** — never edit |
| You're a builder agent asked to review | **Must delegate** — never review your own work |

## Handoff Format

When delegating via the `task` tool, wrap your prompt in this structure:

### Request (caller → subagent)
```
## HANDOFF REQUEST
Agent: <agent-name>
Task ID: <short-unique-id>
Phase: understand | plan | execute | review | learn
Complexity: easy | medium | hard | very-large

### Context
<relevant files, memory refs, constraints, prior work>

### Goal
<one-line objective of what subagent should accomplish>

### Expected Output
<what the subagent must return — specific format>

### Permissions
<what subagent IS allowed to do — repeat their permissions>

### Limits
<what subagent is NOT allowed to do>
```

### Response (subagent → caller)
```
## HANDOFF RESULT
Status: success | failure | partial
Task ID: <matching-id>

### Summary
<one-line result>

### Details
<full output — diffs, findings, analysis>

### Receipts
<verification evidence: file hashes, test output, build status>

### Next
<suggested follow-up actions for the caller>

### Learning
<patterns worth persisting: repeated failure modes, user preferences, project conventions>
```

## Complexity Assessment

Always assess task complexity before deciding delegation strategy:

| Level | Criteria | Strategy |
|-------|----------|----------|
| **Easy** | 1-2 files, well-known pattern, single atomic change | Handle directly. No subagent needed. |
| **Medium** | 3-10 files, new feature, needs exploration/research | 2-5 subagents (sequential or parallel fan-out). Checkpoint between each. |
| **Hard** | 10+ files, cross-cutting change, requires planning + execution + review | Sequential multi-agent: `planner` → executor → `code-reviewer` → `security-reviewer`. Checkpoint between each. |
| **Very Large** | 50+ files, massive refactor, audit of entire codebase | Fan-out: split into chunks, assign to parallel subagents, consolidate results. |

### Fan-Out Pattern

Break the work into N independent chunks. Assign each to a separate subagent in parallel (separate `task` calls). Then assign a consolidation agent to merge results.

```
Example: Review 100 files
├── Subagent A: review files 1-33
├── Subagent B: review files 34-66  
├── Subagent C: review files 67-100
└── Caller: consolidate findings into single report
```

## Agent Permissions

Every agent has a permission tier. Respect these boundaries.

### Tier 1 — Read-Only (planner, architect, code-reviewer, security-reviewer, explore, reviewers)
| Action | Status |
|--------|--------|
| Read files | ✅ Allow |
| Search/grep | ✅ Allow |
| Write/edit files | ❌ Deny |
| Execute bash | ❌ Deny |
| Delegate to other agents | ✅ Only to same-tier or OpenHermes |

### Tier 2 — Builder (build-error-resolver, all build-*, doc-updater, refactor-cleaner, tdd-guide)
| Action | Status |
|--------|--------|
| Read files | ✅ Allow |
| Search/grep | ✅ Allow |
| Write/edit files | ✅ Allow (scope-limited) |
| Execute bash | ✅ Allow |
| Delegate to other agents | ✅ When outside scope |

### Tier 3 — Full Access (OpenHermes primary, loop-operator, e2e-runner)
| Action | Status |
|--------|--------|
| Read files | ✅ Allow |
| Write/edit files | ✅ Allow |
| Execute bash | ✅ Allow |
| Delegate to any agent | ✅ Allow |

### Hard Rules

1. **Review agents must NEVER edit code directly.** If a review finds issues, delegate to a builder to fix.
2. **Planning agents must NEVER implement.** Produce the plan, hand off execution.
3. **Builder agents must NOT review their own work.** After implementing, delegate review to `code-reviewer`.
4. **Security-reviewer only reports, never patches.** Delegate fixes to `OpenHermes` or a builder.
5. **Explore only reads, never writes.** Use for investigation, then hand off to a builder for changes.

## Phase Protocol

Every non-trivial task follows phases. Checkpoint between each phase.

```
Phase 1: Understand
  - Read task, search memory for related context
  - Gather files, check constraints
  → Output: task analysis + file list

Phase 2: Plan
  - Decompose into subtasks
  - Assign each to best agent
  - Set checkpoints per subtask
  → Output: execution plan

Phase 3: Execute
  - One subtask at a time
  - Delegate to builders when implementation needed
  - Verify each subtask before next
  → Output: changes + verification

Phase 4: Review
  - Delegate review to code-reviewer / security-reviewer
  - Check against plan requirements
  → Output: review report + verdict

Phase 5: Learn
  - Check for repeated patterns (see Learning Triggers)
  - Save useful info to memory
  - Save checkpoint
  → Output: learning receipt

Phase 6: Continue or Handoff
  - If more work remains → loop back to Phase 2/3
  - If done → return structured result
  → Output: final handoff result
```

### Checkpoint Before Every Handoff

Before delegating to another agent, always save a checkpoint:

```
ohc_save(
  class: "checkpoint",
  id: "chk_{task-id}_{phase}",
  data: JSON.stringify({
    summary: "Pre-handoff: <phase> -> <next-agent>",
    mission: "<what we're building>",
    current_state: "<what's done so far>",
    next_actions: ["<what the next agent needs to do>"],
    blockers: ["<any issues>"],
    risk_notes: ["<risks>"]
  })
)
```

## Agent Selection Guide

When you need to delegate, pick by task type:

| Task type | Best agent | Second choice |
|-----------|-----------|---------------|
| System architecture design | `architect` | `planner` |
| Feature/refactor planning | `planner` | `OpenHermes` |
| Multi-file codebase search | `explore` | `general` |
| Build/type error fix | `build-error-resolver` | language-specific `build-*` |
| Code quality review | `code-reviewer` | language-specific `review-*` |
| Security audit | `security-reviewer` | `code-reviewer` |
| E2E test writing/running | `e2e-runner` | `tdd-guide` |
| TDD workflow | `tdd-guide` | `OpenHermes` |
| Doc/codemap update | `doc-updater` | `OpenHermes` |
| Dead code cleanup | `refactor-cleaner` | language-specific `build-*` |
| Database review | `review-database` | `security-reviewer` |
| Language-specific build fix | `build-{lang}` | `build-error-resolver` |
| Language-specific review | `review-{lang}` | `code-reviewer` |
| Managed autonomous loop | `loop-operator` | `OpenHermes` |
| Doc lookup (MCP) | `docs-lookup` | `explore` |
| Harness audit | `harness-optimizer` | `security-reviewer` |

### Language Mapping

Check project root for these markers to route to language-specific agents:

| Marker file | Builder agent | Reviewer agent |
|-------------|--------------|----------------|
| `Cargo.toml` | `build-rust` | `review-rust` |
| `go.mod` | `build-go` | `review-go` |
| `pom.xml` / `build.gradle` | `build-java` | `review-java` |
| `build.gradle.kts` | `build-kotlin` | `review-kotlin` |
| `CMakeLists.txt` / `compile_commands.json` | `build-cpp` | `review-cpp` |
| `pyproject.toml` / `setup.py` | `build-error-resolver` | `review-python` |
| None of the above | `build-error-resolver` | `code-reviewer` |

## Learning Triggers

Detect repeated patterns and persist them to memory proactively.

| Trigger | Action | Memory class |
|---------|--------|-------------|
| Same bash command fails 3+ times | Search memory for prior fix. If found, apply. If not found, save the eventual fix. | `mistake` |
| User repeats same instruction 2+ times | Save as preference/constraint. | `constraint` |
| User corrects the same thing 2+ times | Save as project convention. | `decision` |
| A workflow is repeated 3+ times | Save as project convention (e.g. "this project always requires: bump version → npm pack → git commit/push"). | `decision` |
| A build command is discovered for a new project | Save as project convention. | `constraint` |
| An agent is repeatedly incorrectly chosen for a task type | Update routing preference. | `instinct` |

### How to Save Learning

```
ohc_save(
  class: "<appropriate-class>",
  id: "<project-or-feature-related-id>",
  data: JSON.stringify({
    summary: "<what was learned>",
    scope: "project",  // or "global" if universally applicable
    project: "<project-name>",
    tags: ["<relevant-tags>"],
    <class-specific-fields>
  })
)
```

### Learning Check (End of Every SubTask)

After each agent returns, check:
1. Did the subagent include a `Learning` section? If yes, evaluate and persist.
2. Did the same type of failure happen before? Check `ohc_search` for similar mistakes.
3. Did we learn anything about this project that will help next time?

## How This Stays Simple

1. **No new tools or middleware.** The existing `task` tool is the handoff mechanism. The format is just structured text.
2. **No new plugins.** Rules are documents, not code. The system survives regen of `node_modules`.
3. **Standardized prompt sections.** Each agent prompt follows the same pattern — Identity, Role, Permissions, Handoff, Workflow, Output.
4. **Self-correcting.** Repeated failures trigger memory persistence, which feeds back into better routing.
5. **Additive.** New subagents just need the same standardized prompt sections. No other wiring required.
