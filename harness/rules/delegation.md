# Subagent Delegation Reference

Full subagent reference table. Main context = coordination, planning, verification only. Substantive action → subagent.

## Hard Rules

| Activity | Mandatory action |
|----------|------------------|
| Implementation >1 file | Delegate to appropriate specialist |
| Search >1 file | Use native read/grep/glob tools first; delegate to an available specialist when needed |
| Read-for-analysis | Use native read tool; delegate to explorer for large-scale analysis |
| Build failure | `build-error-resolver` |
| Code review | `code-reviewer` |
| Security check | `security-reviewer` |
| Anything not trivially single-step | Delegate to an available specialist/subagent |

## Subagent Catalog — Tiered

### Tier 1 — Core (always available, openhermes-owned)

| Subagent | Edit | When to use |
|----------|------|-------------|
| **planner** | deny | Complex feature planning, refactoring design, architecture decisions |
| **build-error-resolver** | allow | Build failures, compilation errors, type errors — any language |
| **code-reviewer** | deny | Post-implementation code review, parity checks before task close |
| **security-reviewer** | deny | Vulnerability detection, report only (does not patch) |
| **openhermes-optimizer** | ask | OpenHermes config, rules, schemas, memory structure optimization |
| **doc-updater** | ask | Documentation, codemaps, READMEs — docs-only scope |
| **explorer** | deny | Multi-file search, codebase exploration, read-only analysis |
| **general** | ask | General-purpose multi-step research and execution |

### Tier 2 — Language Specialists (optional, match by project marker)

| Subagent | Edit | Trigger marker |
|----------|------|---------------|
| **rust-build-resolver** | allow | `Cargo.toml` present |
| **rust-reviewer** | deny | `Cargo.toml` present |
| **go-build-resolver** | allow | `go.mod` present |
| **go-reviewer** | deny | `go.mod` present |
| **java-build-resolver** | allow | `pom.xml` or `build.gradle` present |
| **java-reviewer** | deny | `pom.xml` or `build.gradle` present |
| **kotlin-build-resolver** | allow | `build.gradle.kts` present |
| **kotlin-reviewer** | deny | `build.gradle.kts` present |
| **cpp-build-resolver** | allow | `CMakeLists.txt` or `compile_commands.json` present |
| **cpp-reviewer** | deny | `CMakeLists.txt` or `compile_commands.json` present |
| **python-reviewer** | deny | `pyproject.toml` or `setup.py` present |

### Tier 3 — Specialized (use only when explicitly matched)

| Subagent | Edit | When to use |
|----------|------|-------------|
| **database-reviewer** | deny | PostgreSQL schema/queries/migrations explicitly in scope |
| **e2e-runner** | allow | Playwright end-to-end tests explicitly requested |
| **tdd-guide** | deny | Test-driven development red-green-refactor requested |
| **refactor-cleaner** | ask | Dead code cleanup, consolidation — requires explicit scope |
| **loop-operator** | ask | Autonomous agent loop — requires explicit invocation |
| **docs-lookup** | deny | Context7-powered documentation lookups |
| **architect** | deny | System-level architecture design |

## Deterministic Routing

1. **Build failure**: Check project marker → route to matching language resolver. No marker → `build-error-resolver`.
2. **Code review**: Check project marker → route to matching language reviewer. No marker → `code-reviewer`.
3. **Multi-file search/exploration**: `explorer` subagent (read-only).
4. **Planning/design**: `planner` for architecture, `architect` only for full system design.
5. **Security**: Always `security-reviewer`. It reports, does not patch.

## Delegation Rules

1. Do NOT delegate trivial single-step operations (simple reads, one-line edits).
2. For everything else, choose the subagent whose description best fits the work.
3. Delegate via the `task` tool.
4. Subagent returns: diff + summary + verification result.
5. Main context inspects only the return — never the raw subagent session.
6. Prefer Tier 1 core agents. Only use Tier 2/3 when the task explicitly matches.
7. Never delegate to an edit-capable agent from a review agent.
