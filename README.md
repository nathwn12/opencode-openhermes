<p align="center">
  <h1 align="center">&#9764; OpenHermes v4</h1>
  <p align="center"><i>The Orchestrator — self-improving agent that gets smarter every session.</i></p>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/openhermes"><img src="https://img.shields.io/npm/v/openhermes?style=for-the-badge&label=version&color=FFD700" alt="npm version"></a>
  <a href="https://github.com/nathwn12/openhermes/blob/master/LICENSE"><img src="https://img.shields.io/badge/license-MIT-green?style=for-the-badge" alt="License: MIT"></a>
  <a href="https://opencode.ai"><img src="https://img.shields.io/badge/runs%20on-OpenCode-6366f1?style=for-the-badge" alt="Runs on OpenCode"></a>
</p>

---

```json
{ "plugin": ["openhermes"] }
```

**One line. Your agent gains durable SQLite memory, 26 self-serve skills, a 4-principle constitution, and session-persistent context — with zero external dependencies.**

---

## Install

```bash
npm install openhermes@latest
```

Add `{ "plugin": ["openhermes"] }` to your OpenCode config at `~/.config/opencode/opencode.json`.

## Commands

| Command | Description |
|---------|-------------|
| `/oh-doctor` | 10 health checks: store, DB integrity, skills linked, config valid, storage, cache, logs, WAL mode, OpenCode version, auth.json |

## Upgrading from v3

<details>
<summary>v3 → v4 migration (click to expand)</summary>

v4 is a complete rebuild. No backward compat. To migrate your v3 data:

1. Your v3 SQLite database at `~/.local/share/opencode/openhermes/memory.db` is **compatible** — v4 reads the same file. Old `audit`, `backlog`, `constraint`, `instinct`, `verification_receipt` tables sit unused.
2. Skills auto-copy to `~/.config/opencode/skills/`.
3. If you had any custom commands or subagents pointing at the OpenHermes harness, update them for v4 paths.

To clean up v3 artifacts:

```bash
# These are optional — v4 ignores old files
rm -rf ~/.local/share/opencode/openhermes/runtime
```
</details>
