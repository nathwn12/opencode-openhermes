<p align="center">
  <img src="https://img.shields.io/badge/OpenHermes-Constitutional%20Router-gold?style=for-the-badge" alt="OpenHermes">
</p>

<h1 align="center">OpenHermes</h1>

<p align="center"><b>Turn OpenCode into a disciplined, memory-backed, self-improving agent system.</b></p>

<p align="center">
  OpenHermes installs a constitutional personality layer, native durable memory tools, specialist routing,
  autonomous checkpointing, verification discipline, and a closed learning loop directly inside OpenCode.
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/openhermes"><img src="https://img.shields.io/npm/v/openhermes?style=for-the-badge&label=npm&color=FFD700" alt="npm version"></a>
  <a href="https://github.com/nathwn12/openhermes/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-16a34a?style=for-the-badge" alt="License: MIT"></a>
  <a href="https://opencode.ai"><img src="https://img.shields.io/badge/platform-OpenCode-6366f1?style=for-the-badge" alt="Runs on OpenCode"></a>
  <a href="https://github.com/nathwn12/openhermes/issues"><img src="https://img.shields.io/badge/issues-welcome-f97316?style=for-the-badge" alt="Issues welcome"></a>
</p>

---

## Why People Install OpenHermes

Most agents can write code.

Fewer can do all of this in one session without drifting:

- stay terse under pressure
- route non-trivial work to the right specialist
- preserve state across compaction and future sessions
- log mistakes with prevention rules
- verify claims before announcing success
- improve their own operating discipline over time

OpenHermes adds that layer to OpenCode.

It is not a chatbot skin. It is not a prompt paste. It is an agent operating system packaged as an OpenCode plugin.

```bash
npm i openhermes
```

---

## The Pitch

**Without OpenHermes**

- long, bloated main-context sessions
- weak recall after compaction
- inconsistent task routing
- unverifiable claims
- repeated mistakes with no memory of the last failure

**With OpenHermes**

- constitution injected at session start
- memory classes persisted to disk
- native `hm_*` tools available in-process
- mandatory subagent routing rules
- autonomous checkpoints before compaction
- verification receipts cached by artifact fingerprint
- mistake logging and self-healing escalation

---

## What OpenHermes Actually Is

OpenHermes is a full plugin suite for OpenCode made of five cooperating runtime plugins:

| Plugin | Job |
|---|---|
| `BootstrapPlugin` | Registers agents, commands, skill directories, and injects constitutional runtime context |
| `MemoryToolsPlugin` | Exposes native in-process memory tools: `hm_put`, `hm_get`, `hm_list`, `hm_latest`, `hm_search` |
| `AutorecallPlugin` | Rehydrates useful recent state at session start |
| `CuratorPlugin` | Handles checkpoints, audits, mistake logging, compaction receipts, and session hygiene |
| `SkillBuilderPlugin` | Detects repeated complex work and turns it into skill-candidate backlog entries |

This means OpenHermes is not just telling the model to behave better.

It changes the runtime shape around the model.

---

## What You Get

<table>
<tr><td width="180"><b>Constitution</b></td><td>11 operating principles injected into every session: pragmatic over performative, concise over verbose, inspect first, smallest correct change, verify before claiming success.</td></tr>
<tr><td><b>Delegation</b></td><td>Non-trivial work gets routed to the right specialist path instead of inflating main context.</td></tr>
<tr><td><b>Durable Memory</b></td><td>9 memory classes for checkpoints, constraints, decisions, instincts, backlog, mistakes, audits, verification receipts, and recall state.</td></tr>
<tr><td><b>Native Tools</b></td><td>Memory operations are exposed as native tools, not a separate MCP sidecar.</td></tr>
<tr><td><b>Verification</b></td><td>Claims are supposed to be backed by receipts, fingerprints, outputs, hashes, or reruns.</td></tr>
<tr><td><b>Compaction Survival</b></td><td>Checkpoint + recall flow preserves mission state before context gets compressed.</td></tr>
<tr><td><b>Self-Healing</b></td><td>Mistakes are logged, repeated failures escalate, and prevention rules get attached to the next pass.</td></tr>
<tr><td><b>Procedural Skills</b></td><td>Bundled skills cover API design, backend patterns, frontend patterns, security review, E2E testing, TDD workflow, verification loops, and more.</td></tr>
<tr><td><b>Zero Sidecars</b></td><td>No Python. No uv. No daemon. No Docker. No separate database stack. Just your OpenCode runtime.</td></tr>
</table>

---

## Fast Install

### Published release

```json
{
  "plugin": ["openhermes"]
}
```

### GitHub-backed install

```json
{
  "plugin": ["openhermes@git+https://github.com/nathwn12/openhermes.git"]
}
```

That is enough.

OpenHermes auto-registers the rest.

| Auto-registered | Count | Notes |
|---|---:|---|
| Specialist subagents | 7 | `architect`, `planner`, `code-reviewer`, `security-reviewer`, `build-error-resolver`, `e2e-runner`, `explore` |
| Slash commands | 7 | `/plan`, `/build-fix`, `/code-review`, `/security`, `/doctor`, `/memory-search`, `/learn` |
| Native memory tools | 5 | `hm_put`, `hm_get`, `hm_list`, `hm_latest`, `hm_search` |
| Bundled procedural skills | 10 | Loaded on demand via the `skill` tool |
| Runtime plugins | 5 | bootstrap, memory-tools, autorecall, curator, skill-builder |

---

## First Session Experience

When the next OpenCode session starts, OpenHermes wires in a lot more than a package import:

1. Bootstrap registers agent prompts, slash commands, and bundled skill directories.
2. Chat transform injects the constitution, runtime, and routing layer.
3. Autorecall rebuilds recent durable state.
4. Native memory tools become immediately callable.
5. Curator watches idle/error/compaction events and writes structured memory.
6. SkillBuilder watches session complexity for future automation opportunities.

In practice: the agent starts the session with a better operating model, better continuity, and better failure discipline.

---

## Memory Model

OpenHermes stores structured agent memory in schema-validated records.

| Class | Purpose |
|---|---|
| `checkpoint` | Snapshot mission, current state, blockers, next actions |
| `constraint` | Hard limits, safety rails, environment facts |
| `decision` | Durable project choices that should shape later behavior |
| `instinct` | Reusable trigger-to-action operating patterns |
| `backlog` | Evidence-backed self-improvement work |
| `mistake` | Failure record with root cause, fix, prevention rule, strike count |
| `audit` | Structured health and integrity reports |
| `verification_receipt` | Cached proof that something was actually verified |
| `recall` | Aggregated state for session boot and compaction recovery |

Storage layout follows OpenCode conventions:

| Location | Purpose |
|---|---|
| `~/.config/opencode/openhermes/` | config, schemas, archive |
| `~/.local/share/opencode/openhermes/` | durable memory and runtime state |
| `~/.cache/opencode/openhermes/recall/` | derived recall cache |

Every write is hardened before persistence:

- schema validation gate
- sensitive text redaction
- prototype pollution stripping
- truncation guards
- atomic disk writes

---

## Verification Discipline

OpenHermes is built around one core stance:

> Do not trust vibes. Trust receipts.

That means the agent is pushed toward:

- reading files before editing
- running commands before claiming success
- caching verification receipts by artifact fingerprint
- re-verifying when files change
- flagging contradictions instead of smoothing over them

If a user says something worked, and the command output says otherwise, OpenHermes biases toward the output.

---

## Self-Healing Loop

When something goes wrong, OpenHermes does not stop at "oops":

| Tier | Trigger | Response |
|---|---|---|
| `T0` | first mistake | log, correct narrowly, verify |
| `T1` | repeat mistake | add prevention rule and targeted verification |
| `T2` | systemic failure | specialist diagnosis, audit, backlog follow-up |
| `T3` | cascading instability | constrained safe mode and structured handoff |

No grandstanding. No fake confidence. Narrow scope, preserve evidence, recover.

---

## Session Lifecycle

```text
OpenCode starts
  -> BootstrapPlugin registers subagents, commands, skills
  -> chat.transform injects constitution + runtime + router
  -> AutorecallPlugin restores recent state
  -> MemoryToolsPlugin exposes hm_* tools
  -> work happens
  -> CuratorPlugin writes checkpoints, audits, mistakes, receipts
  -> SkillBuilderPlugin proposes future automation when patterns repeat
```

---

## Bundled Framework

The npm package includes the runnable plugins plus the full bundled harness:

```text
index.mjs
bootstrap.mjs
autorecall.mjs
curator.mjs
skill-builder.mjs
lib/
schemas/
harness/
  constitution/
  instructions/
  rules/
  skills/
  commands/
```

The harness ships the constitutional text, routing rules, memory policy, verification rules, checkpointing rules, escalation rules, and bundled procedural skills.

This matters because the package is not merely a runtime shim. The operational doctrine ships with it.

---

## Why OpenHermes Is Different

OpenHermes is inspired by the broader self-improving agent movement, especially Hermes Agent and OpenCode-DCP, but it takes a very specific stance:

- native to OpenCode
- minimal install burden
- strong operational discipline
- durable receipts over conversational confidence
- memory as structured runtime state, not just notes

If you want a bigger agent platform, use a bigger agent platform.

If you want OpenCode to become sharper, stricter, and much harder to derail, install OpenHermes.

---

## Environment Variables

| Variable | Default | Effect |
|---|---|---|
| `OPENCODE_ALLOW_PROJECT_HARNESS` | `false` | Allow project-local harness override at `.opencode/openhermes/` |
| `OPENCODE_CURATOR_LOGS` | `false` | Emit curator diagnostics to stderr |

---

## Contributing

Issues, ideas, bug reports, sharper rules, stronger skills: [open an issue](https://github.com/nathwn12/openhermes/issues).

---

## License

MIT. See [LICENSE](LICENSE).
