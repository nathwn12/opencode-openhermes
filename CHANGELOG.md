# Changelog

All notable changes to OpenHermes are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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

[4.11.0]: https://github.com/nathwn12/openhermes/compare/v4.10.0...v4.11.0
[4.10.0]: https://github.com/nathwn12/openhermes/compare/v4.9.2...v4.10.0
