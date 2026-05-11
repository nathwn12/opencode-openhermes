# Subagent Delegation Reference

Full subagent reference table. Main context = coordination, planning, verification only. Substantive action → subagent.

## Hard Rules

| Activity | Mandatory action |
|----------|------------------|
| Implementation >1 file | Delegate to appropriate specialist |
| Search >1 file | Use native read/grep/glob tools first; delegate to an available specialist when needed |
| Read-for-analysis | Use native read tool; delegate to explore for large-scale analysis |
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
| **harness-optimizer** | deny | OpenHermes config audit, tune, and measure |
| **docs-lookup** | deny | Real-time documentation queries via MCP |
| **doc-updater** | ask | Documentation, codemaps, READMEs — docs-only scope |
| **refactor-cleaner** | ask | Dead code cleanup, duplicate consolidation |
| **tdd-guide** | ask | Test-driven development red-green-refactor enforcement |
| **loop-operator** | ask | Autonomous agent loop — start, monitor, intervene |
| **explore** | deny | Multi-file search, codebase exploration, read-only analysis |

### Tier 2 — Language Specialists (optional, match by project marker)

| Subagent | Edit | Trigger marker |
|----------|------|---------------|
| **build-rust** | allow | `Cargo.toml` present |
| **review-rust** | deny | `Cargo.toml` present |
| **build-go** | allow | `go.mod` present |
| **review-go** | deny | `go.mod` present |
| **build-java** | allow | `pom.xml` or `build.gradle` present |
| **review-java** | deny | `pom.xml` or `build.gradle` present |
| **build-kotlin** | allow | `build.gradle.kts` present |
| **review-kotlin** | deny | `build.gradle.kts` present |
| **build-cpp** | allow | `CMakeLists.txt` or `compile_commands.json` present |
| **review-cpp** | deny | `CMakeLists.txt` or `compile_commands.json` present |
| **review-python** | deny | `pyproject.toml` or `setup.py` present |

### Tier 3 — Specialized (use only when explicitly matched)

| Subagent | Edit | When to use |
|----------|------|-------------|
| **review-database** | deny | PostgreSQL schema/queries/migrations explicitly in scope |
| **e2e-runner** | allow | Playwright end-to-end tests explicitly requested |
| **architect** | deny | System-level architecture design |

## Deterministic Routing

1. **Build failure**: Check project marker → route to matching language resolver (e.g. `build-rust`, `build-go`, `build-java`, `build-kotlin`, `build-cpp`). No marker → `build-error-resolver`.
2. **Code review**: Check project marker → route to matching language reviewer (e.g. `review-rust`, `review-go`, `review-java`, `review-kotlin`, `review-cpp`, `review-python`). No marker → `code-reviewer`.
3. **Multi-file search/exploration**: `explore` subagent (read-only).
4. **Planning/design**: `planner` for architecture, `architect` only for full system design.
5. **Security**: Always `security-reviewer`. It reports, does not patch.
6. **Documentation**: `docs-lookup` for live queries, `doc-updater` for generating/updating docs and codemaps.
7. **Dead code**: `refactor-cleaner` for detection and safe removal.
8. **TDD**: `tdd-guide` for red-green-refactor cycle enforcement.
9. **Harness health**: `harness-optimizer` for audit and tuning.
10. **Autonomous loops**: `loop-operator` for safe managed iteration.

## Delegation Rules

1. Do NOT delegate trivial single-step operations (simple reads, one-line edits).
2. For everything else, choose the subagent whose description best fits the work.
3. Delegate via the `task` tool.
4. Subagent returns: diff + summary + verification result.
5. Main context inspects only the return — never the raw subagent session.
6. Prefer Tier 1 core agents. Only use Tier 2/3 when the task explicitly matches.
7. Never delegate to an edit-capable agent from a review agent.
