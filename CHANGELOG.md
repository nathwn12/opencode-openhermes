# Changelog

All notable changes to OpenHermes are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [4.11.3] - 2026-05-18

### Changed

- **Type safety hardened across hook system** — `HookContext` split into `HookContextBase` and `HookContextExtras` with explicit optional keys. Removed `as` casts throughout hooks, bootstrap, and sync modules. `HookContextPatch` type added for partial updates.

- **Singleton pattern unified** — All singletons (`BackgroundManager`, `HookRegistry`, `MemoryManager`, `PlanFileWatcher`, `PlanSync`) now use `| null` typed static fields with proper null checks and `resetInstance()` that sets to `null` instead of `null as unknown as T`.

### Removed

- **Deprecated harness components** — Removed `harness/commands/oh-doctor.md`, `harness/commands/oh-log.md`, `scripts/oh-doctor.ps1`, and associated behavioral test from `test/plugins-behavioral.test.ts`. Updated `package.json` `files` field to exclude `scripts/` and `harness/commands/`.

- **Dead `PlanStore.getMerged` method** — Placeholder implementation that always returned an empty array; removed entirely.

- **Dead dependency `gpt-tokenizer`** — Cleaned up in `package-lock.json`.

### Added

- **`plan-location.ts` module** — Extracted plan file location logic from `bootstrap.ts` into a dedicated module under `harness/lib/plans/`, providing cleaner imports for hook modules and new `resolvePlanAccess`/`ensurePlanFile`/`readPlanSummary` functions.

### Tests

- Added `resetInstance` tests for `BackgroundManager` and `PlanFileWatcher`.
- Added `plan-location` import test validating hook modules import without bootstrap cycle failure.
- Updated composer tests to assert no hardcoded `harness/commands/` paths in `ETHOS.md` and `CONTEXT.md`.

## [4.11.2] - 2026-05-17

### Fixed

- Current operational state hardened and documented for Windows/OpenCode edge cases.

### Tests

- All existing tests continue to pass.

## [4.11.1] - 2026-05-17

### Security

- **Background Manager — Full arg sanitization** — Command arguments are now sanitized for shell metacharacters (`&|;<>^%!`) on Windows, closing a command injection vector where LLM-generated args could be interpreted as shell syntax by `cmd.exe`.

### Fixed

- **PlanStore — Lost-update race eliminated** — Added per-path in-process mutex (`PathMutex`) around `addFinding()` and `addDecision()` read-modify-write cycles. Concurrent writes to the same plan file from memory sync and plan sync no longer silently overwrite each other's data.

- **PlanSync — Verification now checks own entry** — The post-write verification loop no longer skips the written entry, ensuring concurrent overwrites are detected immediately and trigger a retry.

- **Atomic write Windows fallback** — The EPERM fallback path (used when `rename` fails on cross-device or locked files) no longer leaves a crash window between `readFile` and `unlink`. Content is written directly since it's already in memory.

- **Confidence Gate — Dead code reactivated** — The MEDIUM/LOW confidence gate INJECT result now injects awareness instructions into the task description instead of being silently discarded. Receiving sub-agents see `[CONFIDENCE: MEDIUM] Review your plan before executing` or `[CONFIDENCE: LOW] Pause for user approval` prefixed to their prompt.

### Removed

- **Dead dependency `gpt-tokenizer`** — Zero imports across all TypeScript source files. Removed from `package.json` along with the sole consumer `scripts/count-tokens.mjs`.

### Tests

- All 286 existing tests continue to pass. No behavioral regressions from any fix.

## [4.11.0] - 2026-05-17

### Fixed

- **Bootstrap Hardening** — Graceful error handling for directory creation, plan file writes, and hook execution (PreTool, Route, PostTool). Plan system degrades gracefully on filesystem failures instead of crashing.
- **Background Manager** — Command sanitization prevents LLM-generated injection via shell metacharacters. Zombie process detection sweeps orphaned tasks. Windows `taskkill` now awaited before SIGTERM fallback.
- **Composer** — Path traversal sanitization prevents directory escape via fragment names containing `../` or `:`.
- **Memory Manager** — Budget validation guard prevents `prune()` from operating on invalid (non-numeric/negative) budget values.
- **Anomaly Tracker** — Cross-invocation identical output detection flags repeated content after 3 identical emissions.
- **Sanity Checker** — Type guard for non-string inputs (null/undefined → critical). Empty string now properly flagged as warning. Cross-invocation dedup integration with AnomalyTracker.
- **Plan Sync** — Cross-entry conflict detection during upsert catches concurrent writes to sibling entries. Windows-safe temp file fallback using read+write+unlink instead of `copyFile`.
- **File Watcher** — Debounce pause timing fixed: events received during pause are debounced and fire on resume rather than being silently dropped.
- **Recovery Patterns** — Gibberish detection now uses a real heuristic regex (keyboard mash, repeated chars, long non-alphabetic sequences) instead of a never-matching placeholder.

### Tests

- Updated recovery tests to verify gibberish classification produces a retry action with prompt modification.
- Updated sanity tests to assert empty string → warning, null/undefined → critical.

## [4.10.0] - 2026-05-17

### Added

- **Prompt Composer** — Monolithic agent prompt split into 9 independently-loadable fragments with a composition module. Adding a new fragment requires creating a file only.
- **Auto-Recovery System** — Pattern-based error classification covering 9 categories (rate limiting, context overflow, network failures, session errors, tool errors, parse errors, gibberish, LSP diagnostics, timeouts). Typed recovery actions with exponential backoff, context compaction, and escalation.
- **4-Tier Hierarchical Memory** — System, Project, Mission, and Task memory levels with importance scoring, budget enforcement via automatic pruning, and plan-file persistence.
- **Pluggable Hook Registry** — Topological-sort hook system replacing hardcoded routing. Supports PreToolUse, PostToolUse, Route, and Session lifecycle hooks with phase ordering (early/normal/late), priority ranking, and dependency resolution with cycle detection. Ships with 8 built-in hooks: plan check, shell detection, confidence gating, delegation depth guard, route tracking, error recovery, memory sync, and output sanity check.
- **MVCC Plan Synchronization** — Concurrent-safe plan file updates via atomic writes (temp + rename), version counters, conflict detection, and a file watcher with debounced reloads for cross-session awareness.
- **Output Sanity Checker** — 8 detection patterns for LLM output degeneration (character repetition, pattern loops, low information density, visual gibberish, line repetition, CJK spam, empty output, error-stack bleed). Anomaly escalation triggers context compaction after consecutive violations.
- **Background Command System** — Fire-and-forget child process management with immediate task ID return, status polling, timeout enforcement, process kill, and automatic cleanup of completed tasks.
- **Test Harness Infrastructure** — Reusable test utilities: disposable temp directories with Symbol.asyncDispose for auto-cleanup, typed factory functions for test objects, and restore-capable mocks for console, process exit, filesystem, event emitters, and abort controllers.

[4.11.1]: https://github.com/nathwn12/openhermes/compare/v4.11.0...v4.11.1
[4.11.2]: https://github.com/nathwn12/openhermes/compare/v4.11.1...v4.11.2
[4.11.3]: https://github.com/nathwn12/openhermes/compare/v4.11.2...v4.11.3
[4.11.0]: https://github.com/nathwn12/openhermes/compare/v4.10.0...v4.11.0
[4.10.0]: https://github.com/nathwn12/openhermes/compare/v4.9.2...v4.10.0
