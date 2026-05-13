import path from "node:path"
import fs from "node:fs"
import os from "node:os"
import { fileURLToPath } from "node:url"
import { createLogger } from "./lib/logger.mjs"
import { getHarnessDir, setHarnessRootForTest, resolveHarnessRoot } from "./lib/harness-resolver.mjs"

const log = createLogger("bootstrap")
let _bootstrapping = false
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const CONFIG_DIR = path.join(os.homedir(), ".config", "opencode")
const OVERRIDE_SOUL = path.join(CONFIG_DIR, "SOUL.md")

// Re-export for backward compatibility (tests import from bootstrap.mjs)
export { resolveHarnessRoot, setHarnessRootForTest, getHarnessDir }
function getRulesDir() { return path.join(getHarnessDir(), "rules") }
function getSkillsDir() { return path.join(getHarnessDir(), "skills") }
function getConstitutionFile() { return path.join(getHarnessDir(), "codex", "CONSTITUTION.md") }
function getRuntimeFile() { return path.join(getHarnessDir(), "instructions", "RUNTIME.md") }


function scanDirNames(dir) {
  try { return fs.readdirSync(dir).filter(f => f.endsWith(".md")).map(f => f.replace(/\.md$/, "")).sort() }
  catch { return [] }
}

function scanPromptNames(dir) {
  try { return fs.readdirSync(dir).filter(f => f.endsWith('.md') || f.endsWith('.txt')).map(f => path.basename(f, path.extname(f))).sort() }
  catch { return [] }
}

function scanSkillDirs(dir) {
  try { return fs.readdirSync(dir).filter(f => fs.statSync(path.join(dir, f)).isDirectory()).sort() }
  catch { return [] }
}

function scanSchemaNames(dir) {
  try { return fs.readdirSync(dir).filter(f => f.endsWith(".schema.json")).map(f => f.replace(/\.schema\.json$/, "")).filter(f => f !== "loop-state").sort() }
  catch { return [] }
}

export function buildCapabilityMap(hDir) {
  const cmds = scanDirNames(path.join(hDir, "commands"))
  if (!cmds.includes("oh-update-me")) cmds.push("oh-update-me")
  cmds.sort()

  const agents = scanPromptNames(path.join(hDir, "prompts"))
  const skills = scanSkillDirs(path.join(hDir, "skills"))
  const schemas = scanSchemaNames(path.join(__dirname, "schemas"))

  return [
    "## Capability Map",
    "",
    `Commands  (${cmds.length}):  /${cmds.join(" /")}`,
    `Subagents (${agents.length}): ${agents.join(" ")}`,
    `Skills    (${skills.length}): ${skills.join(" ")}`,
    `Memory    (${schemas.length}): ${schemas.join(" ")}`,
    "",
    `For problem → specialist routing see Delegation below. Skills via \`skill\` tool. Memory via \`ohc_save\` etc.`,
  ].join("\n")
}

export function loadLocalSoulOverride(overridePath) {
  const filePath = overridePath || OVERRIDE_SOUL
  try {
    if (fs.existsSync(filePath)) {
      const text = fs.readFileSync(filePath, "utf8").trim()
      if (text) return text
    }
  } catch {}
  return null
}

function buildBootstrapContent() {
  let constitution = fs.readFileSync(getConstitutionFile(), "utf8")
  const localOverride = loadLocalSoulOverride()
  if (localOverride) {
    constitution += `\n\n## Local Overrides (survives reinstalls)\n\n${localOverride}`
  }
  const runtime = fs.readFileSync(getRuntimeFile(), "utf8")
  const capMap = buildCapabilityMap(getHarnessDir())

  const router = `## AGENTS.md

OpenHermes thin constitutional router. Full harness → \`openhermes/harness/\`.

## Constitution

Pragmatic. Concise. Task-oriented. Subagent-first. Inspect, then act. Scope to the problem. Verify, don't claim. Receipts over vibes. Recover by narrowing, not posturing. Skeptical — demand proof. Precision-first search: needle then broad, never reverse.

## Safety

Snapshot before mutation. Never delete unrelated files. Never assume \`%USERPROFILE%\\.config\\opencode\` is a git repo. Verify or roll back. **NEVER delete \`auth.json\`** (\`%USERPROFILE%\\.local\\share\\opencode\\auth.json\`).

${capMap}

## Delegation (Mandatory)

Main context = coordination + verification only. Substantive work → subagent.

| Trigger | Subagent |
|---------|----------|
| Multi-file implementation | \`oh-architect\` or \`oh-blueprinter\` |
| Build/TS error | \`oh-mender\` |
| Code review | \`oh-auditor\` |
| Security audit | \`oh-warden\` |
| E2E testing | \`oh-e2e\` |
| Multi-file search/exploration | \`oh-explorer\` or \`general\` |
| Documentation lookup | \`oh-scout\` |
| Doc/codemap update | \`oh-scribe\` |
| Dead code cleanup | \`oh-sweeper\` |
| TDD workflow | \`oh-prover\` |
| Autonomous loop | \`oh-pilot\` |
| Go review | \`oh-review-go\` |
| Go build fix | \`oh-build-go\` |
| Database review | \`oh-review-db\` |
| C++ review | \`oh-review-cpp\` |
| Java review | \`oh-review-java\` |
| Java build fix | \`oh-build-java\` |
| Kotlin review | \`oh-review-kotlin\` |
| Kotlin build fix | \`oh-build-kotlin\` |
| Python review | \`oh-review-py\` |
| Rust review | \`oh-review-rust\` |
| Rust build fix | \`oh-build-rust\` |
| Any non-trivial multi-step | appropriate specialist |

Never delegate trivial single-step ops. Subagent returns diff + summary + verification; inspect return only. Full ref: \`openhermes/harness/rules/delegation.md\`.

## Handoff Protocol

Every agent knows its role, permissions, and when to delegate. Before delegating, assess task complexity (easy → direct, medium → single subagent, hard → sequential multi-agent, very-large → fan-out). Use structured handoff format documented in \`openhermes/harness/rules/handoff.md\`.

- **Act**: Task matches your role and permissions → do it directly
- **Delegate**: Task outside your role → pass to correct agent via \`task\` tool
- **Escalate**: Review/planning agents must NEVER edit code. Delegate to builders.
- **Learn**: After each task, check for repeated patterns. Persist to memory via \`ohc_save\`.
- **Checkpoint**: Before every handoff, save a checkpoint.

## Memory — Gated & Precision-First

- **Start**: Read recall cache first. If stale/missing → \`ohc_latest\` for relevant classes.
- **Before work**: Narrow \`ohc_search\` by class, scope, keywords. Never read full indexes.
- **Before close**: Query same-type mistakes (7 days). Match → \`oh-auditor\` or \`oh-warden\`.
- **On failure**: \`ohc_search\` for similar incidents. Search memory before asking user.
- **Precision ladder**: \`ohc_latest\` → \`ohc_search\` → \`ohc_get\` → \`ohc_list\` (last resort). Full index reads only for explicit audit/repair tasks.
- **Anti-spam**: No obvious facts, no one-off prefs, no temp state, no low-risk mistakes. Supersede, don't duplicate. Full rules: \`openhermes/harness/rules/retrieval.md\`, \`openhermes/harness/rules/memory-management.md\`.

## Self-Edit Authority

| Auto | Conditional | Needs approval |
|------|-------------|----------------|
| Memory entries, mistakes, checkpoints, receipts | openhermes docs/schemas/templates/non-core rules patches | AGENTS.md core, model routing, permissions, config, protected settings |

Full tiers: \`openhermes/harness/rules/self-heal.md\`.

## Precedence

1. User instruction. 2. Safety/legal/destructive guard. 3. Constitution (\`openhermes/harness/codex/\`). 4. Project constraints. 5. Project decisions. 6. Verified guards. 7. Checkpoints. 8. Instincts. 9. Freeform notes. Full: \`openhermes/harness/rules/precedence.md\`.

## Hygiene

- Checkpoint on meaningful boundaries. Compress closed segments immediately.
- After subagent return: verify → compress that block.
- Compress proactively.
- Skill candidates → \`/oh-learn\` only if repeated pattern + \`ohc_search\` confirms no dup. See \`openhermes/harness/rules/skills-management.md\`.
- Audit triggers: openhermes/config change, repeated failures, session start when last audit >7 days. See \`openhermes/harness/rules/audit.md\`.

## Escalation

T0: observe → log mistake → smallest fix. T1: add prevention rule → verify. T2: diagnosis/specialist → backlog. T3: constrained safe mode. Full: \`openhermes/harness/rules/self-heal.md\`.

## State

- **Config root**: \`%USERPROFILE%\\.config\\opencode\`
- **Auth**: \`%USERPROFILE%\\.local\\share\\opencode\\auth.json\` (NEVER delete)
- **Forensic ledger**: \`%USERPROFILE%\\.local\\share\\opencode\\opencode.db\``

  return [
    `<OPENHERMES_BOOTSTRAP>\nOpenHermes v${getOwnVersion()} active. Harness: \`openhermes/harness/\`. Memory at \`~/.local/share/opencode/openhermes/memory/\`. Rules at \`openhermes/harness/rules/\`. Skills discoverable via \`skill\` tool — use \`skill\` tool to list/load them.`,
    `<OPENHERMES_CONSTITUTION>\n${constitution}\n</OPENHERMES_CONSTITUTION>`,
    `<OPENHERMES_RUNTIME>\n${runtime}\n</OPENHERMES_RUNTIME>`,
    `<OPENHERMES_ROUTER>\n${router}\n</OPENHERMES_ROUTER>`
  ].join("\n\n")
}

const OWN_VERSION = (() => {
  try {
    return JSON.parse(fs.readFileSync(path.join(__dirname, "package.json"), "utf8")).version || "1.0.0"
  } catch { return "1.0.0" }
})()
function getOwnVersion() { return OWN_VERSION }

export const BootstrapPlugin = async ({ client, directory }) => {
  let _bootstrapCache

  const getContent = () => {
    if (_bootstrapCache !== undefined) return _bootstrapCache
    try {
      _bootstrapCache = buildBootstrapContent()
    } catch (err) {
      log.error("failed to build bootstrap content:", err.message)
      _bootstrapCache = null
    }
    return _bootstrapCache
  }

  return {
    config: async (config) => {
      config.skills = config.skills || {}
      config.skills.paths = config.skills.paths || []
      if (!config.skills.paths.includes(getSkillsDir())) {
        config.skills.paths.push(getSkillsDir())
      }

      const PROMPTS_DIR = path.join(getHarnessDir(), "prompts")
      const COMMANDS_DIR = path.join(getHarnessDir(), "commands")
      const ct = (file) => {
        const fp = path.join(COMMANDS_DIR, file)
        try { return fs.readFileSync(fp, "utf8").trimEnd() + "\n\n$ARGUMENTS" }
        catch { return "$ARGUMENTS" }
      }
      const p = (name) => {
        const fp = path.join(PROMPTS_DIR, name)
        try { return fs.readFileSync(fp, "utf8").trimEnd() }
        catch { return "" }
      }

      const existingCommands = config.command ?? {}
      const existingAgents = { ...(config.agent ?? {}) }

      config.command = {
        ...existingCommands,
        "oh-audit": { agent: "oh-auditor", description: "Unified quality gate (--security, --quality, --test, --verify, --lang=rust|go)", subtask: true, template: ct("oh-audit.md") },
        "oh-blueprint": { agent: "oh-blueprinter", description: "Create a detailed implementation plan", subtask: true, template: ct("oh-blueprint.md") },
        "oh-browse": { agent: "oh-scraper", description: "Browser daemon — persistent Chromium automation", subtask: true, template: ct("oh-browse.md") },
        "oh-doctor": { agent: "OpenHermes", description: "Health diagnostics, --setup-pm, --model", subtask: true, template: ct("oh-doctor.md") },
        "oh-forge": { agent: "OpenHermes", description: "Generate a new skill from git history analysis", subtask: true, template: ct("oh-forge.md") },
        "oh-gauntlet": { agent: "oh-gater", description: "Run multi-stage quality pipeline (scope → security → review → quality → report)", subtask: true, template: ct("oh-gauntlet.md") },
        "oh-guard": { agent: "OpenHermes", description: "Safety modes — careful, freeze, guard", subtask: true, template: ct("oh-guard.md") },
        "oh-inspect": { agent: "oh-tuner", description: "Run harness self-audit across 7 categories", subtask: true, template: ct("oh-inspect.md") },
        "oh-learn": { agent: "OpenHermes", description: "Create a new skill from recent work patterns", subtask: true, template: ct("oh-learn.md") },
        "oh-manifest": { agent: "oh-gater", description: "Run 7-stage manifest pipeline (clarify → blueprint → build → audit → shield → prove → report)", subtask: true, template: ct("oh-manifest.md") },
        "oh-mend": { agent: "oh-mender", description: "Fix build errors (--lang=rust|go|cpp|java|kotlin)", subtask: true, template: ct("oh-mend.md") },
        "oh-pr": { agent: "oh-merger", description: "PR workflow — create, review, merge", subtask: true, template: ct("oh-pr.md") },
        "oh-recall": { agent: "OpenHermes", description: "Search OpenHermes memory with LLM summarization", subtask: true, template: ct("oh-recall.md") },
        "oh-scribe": { agent: "oh-scribe", description: "Update docs (--codemap for architecture maps)", subtask: true, template: ct("oh-scribe.md") },
        "oh-session": { agent: "oh-chronicler", description: "Session management — save, resume, list, prune", subtask: true, template: ct("oh-session.md") },
        "oh-ship": { agent: "oh-publisher", description: "Release pipeline — test, bump, changelog, PR, deploy, verify", subtask: true, template: ct("oh-ship.md") },
        "oh-sweep": { agent: "oh-sweeper", description: "Remove dead code and consolidate duplicates", subtask: true, template: ct("oh-sweep.md") },
        "oh-update-me": { template: "", description: "Force reinstall OpenHermes plugin from latest source" },
        "oh-voyage": { agent: "oh-pilot", description: "Managed loop (--status for status check)", subtask: true, template: ct("oh-voyage.md") },
        "oh-weave": { agent: "oh-blueprinter", description: "Orchestrate agents or eval (--eval)", subtask: true, template: ct("oh-weave.md") },
        "ohc": { template: "", description: "OHC context management: /ohc status, /ohc compress [focus]" },
      }

      config.experimental ??= {}
      config.experimental.primary_tools ??= []
      if (!config.experimental.primary_tools.includes("compress")) {
        config.experimental.primary_tools.push("compress")
      }

      config.agent = {
        ...existingAgents,
        "OpenHermes": {
          description: "Fully autonomous primary coding agent (all tools allowed)",
          mode: "primary",
          color: "#F59E0B",
          permission: {
            bash: { "*": "allow" },
            edit: "allow",
            read: "allow",
            task: { "*": "allow" },
          },
        },
        "oh-architect": {
          description: "Software architecture specialist for system design",
          mode: "subagent",
          prompt: p("oh-architect.txt"),
          permission: { read: "allow", edit: "deny", bash: "deny" },
        },
        "oh-mender": {
          description: "Build and TypeScript error resolution specialist",
          mode: "subagent",
          prompt: p("oh-mender.md"),
          permission: { read: "allow", edit: "allow" },
        },
        "oh-auditor": {
          description: "Expert code review specialist",
          mode: "subagent",
          prompt: p("oh-auditor.md"),
          permission: { read: "allow", edit: "deny", bash: "deny", task: { "oh-explorer": "allow", "*": "deny" } },
        },
        "oh-e2e": {
          description: "End-to-end testing specialist using Playwright",
          mode: "subagent",
          prompt: p("oh-e2e.txt"),
          permission: { read: "allow", edit: "allow" },
        },
        "oh-explorer": {
          description: "Fast read-only codebase exploration agent",
          mode: "subagent",
          prompt: p("oh-explorer.md"),
          permission: { read: "allow", grep: "allow", glob: "allow", list: "allow", edit: "deny", bash: "deny" },
        },
        "oh-blueprinter": {
          description: "Expert planning specialist for complex features and refactoring",
          mode: "subagent",
          color: "#3B82F6",
          prompt: p("oh-blueprinter.md"),
          permission: { read: "allow", edit: "deny", bash: "deny" },
        },
        "oh-warden": {
          description: "Security vulnerability detection and remediation specialist",
          mode: "subagent",
          prompt: p("oh-warden.md"),
          permission: { read: "allow", edit: "deny", bash: "deny", task: { "*": "allow" } },
        },
        "oh-scout": {
          description: "Documentation lookup via MCP — query any library docs in real-time",
          mode: "subagent",
          prompt: p("oh-scout.md"),
          permission: { read: "allow", bash: "allow", edit: "deny" },
        },
        "oh-scribe": {
          description: "Documentation and codemap generation/update specialist",
          mode: "subagent",
          prompt: p("oh-scribe.md"),
          permission: { read: "allow", edit: "allow", bash: "allow" },
        },
        "oh-sweeper": {
          description: "Dead code detection and safe removal specialist",
          mode: "subagent",
          prompt: p("oh-sweeper.md"),
          permission: { read: "allow", edit: "allow" },
        },
        "oh-pilot": {
          description: "Autonomous agent loop operator — safe iteration with stop conditions",
          mode: "subagent",
          prompt: p("oh-pilot.md"),
          permission: { read: "allow", edit: "allow", bash: "allow", task: { "*": "allow" } },
        },
        "oh-tuner": {
          description: "OpenHermes harness configuration optimizer — audit, tune, measure",
          mode: "subagent",
          prompt: p("oh-tuner.md"),
          permission: { read: "allow", bash: "allow", edit: "deny" },
        },
        "oh-prover": {
          description: "Test-Driven Development coach — red-green-refactor cycle enforcement",
          mode: "subagent",
          prompt: p("oh-prover.md"),
          permission: { read: "allow", edit: "allow", bash: "allow" },
        },
        "oh-chronicler": {
          description: "Session management specialist — save, resume, list, prune",
          mode: "subagent",
          prompt: p("oh-chronicler.md"),
          permission: { read: "allow", edit: "allow", bash: "allow" },
        },
        "oh-merger": {
          description: "PR workflow specialist — create, review, merge pull requests",
          mode: "subagent",
          prompt: p("oh-merger.md"),
          permission: { read: "allow", edit: "allow", bash: "allow", task: { "*": "allow" } },
        },
        "oh-scraper": {
          description: "Browser automation specialist — persistent Chromium daemon",
          mode: "subagent",
          prompt: p("oh-scraper.md"),
          permission: { read: "allow", edit: "allow", bash: "allow" },
        },
        "oh-publisher": {
          description: "Release pipeline specialist — test, bump, changelog, PR, deploy, verify",
          mode: "subagent",
          prompt: p("oh-publisher.md"),
          permission: { read: "allow", edit: "allow", bash: "allow", task: { "*": "allow" } },
        },
        "oh-sentinel": {
          description: "Safety guard specialist — careful, freeze, guard modes",
          mode: "subagent",
          prompt: p("oh-sentinel.md"),
          permission: { read: "allow", edit: "deny", bash: "deny" },
        },
        "oh-review-db": {
          description: "PostgreSQL database specialist — query optimization, schema, RLS, indexes",
          mode: "subagent",
          prompt: p("oh-review-db.md"),
          permission: { read: "allow", bash: "allow", edit: "deny" },
        },
        "oh-review-cpp": {
          description: "C++ code review specialist — memory safety, modern C++, RAII",
          mode: "subagent",
          prompt: p("oh-review-cpp.md"),
          permission: { read: "allow", bash: "allow", edit: "deny" },
        },
        "oh-build-cpp": {
          description: "C++ build error resolution specialist — CMake, linker, template errors",
          mode: "subagent",
          prompt: p("oh-build-cpp.md"),
          permission: { read: "allow", edit: "allow", bash: "allow" },
        },
        "oh-review-java": {
          description: "Java/Spring Boot review specialist — JPA, architecture, security",
          mode: "subagent",
          prompt: p("oh-review-java.md"),
          permission: { read: "allow", bash: "allow", edit: "deny" },
        },
        "oh-build-java": {
          description: "Java/Maven/Gradle build error resolution specialist",
          mode: "subagent",
          prompt: p("oh-build-java.md"),
          permission: { read: "allow", edit: "allow", bash: "allow" },
        },
        "oh-review-kotlin": {
          description: "Kotlin/Android review specialist — coroutines, Compose, architecture",
          mode: "subagent",
          prompt: p("oh-review-kotlin.md"),
          permission: { read: "allow", bash: "allow", edit: "deny" },
        },
        "oh-build-kotlin": {
          description: "Kotlin/Gradle build error resolution specialist",
          mode: "subagent",
          prompt: p("oh-build-kotlin.md"),
          permission: { read: "allow", edit: "allow", bash: "allow" },
        },
        "oh-review-py": {
          description: "Python code review specialist — PEP 8, type hints, security",
          mode: "subagent",
          prompt: p("oh-review-py.md"),
          permission: { read: "allow", bash: "allow", edit: "deny" },
        },
        "oh-review-go": {
          description: "Go code review specialist — idiomatic Go, concurrency, error handling",
          mode: "subagent",
          prompt: p("oh-review-go.md"),
          permission: { read: "allow", bash: "allow", edit: "deny" },
        },
        "oh-build-go": {
          description: "Go build error resolution specialist — go build, vet, staticcheck fixes",
          mode: "subagent",
          prompt: p("oh-build-go.md"),
          permission: { read: "allow", edit: "allow", bash: "allow" },
        },
        "oh-review-rust": {
          description: "Rust code review specialist — ownership, lifetimes, safety",
          mode: "subagent",
          prompt: p("oh-review-rust.md"),
          permission: { read: "allow", bash: "allow", edit: "deny" },
        },
        "oh-build-rust": {
          description: "Rust build error resolution specialist — cargo, borrow checker, clippy",
          mode: "subagent",
          prompt: p("oh-build-rust.md"),
          permission: { read: "allow", edit: "allow", bash: "allow" },
        },
        "oh-gater": {
          description: "Multi-agent pipeline orchestrator — runs sequential quality stages (scope → security → review → quality → report)",
          mode: "subagent",
          prompt: p("oh-gater.txt"),
          permission: { read: "allow", edit: "allow", bash: "allow", task: { "*": "allow" } },
        },
      }

      config.default_agent = "OpenHermes"
    },

    "experimental.chat.messages.transform": async (_input, output) => {
      try {
        const bootstrap = getContent()
        if (!bootstrap || !output.messages || !output.messages.length) return
        const firstUser = output.messages.find(m => m && m.info && m.info.role === "user")
        if (!firstUser || !firstUser.parts || !firstUser.parts.length) return
        if (firstUser.parts.some(p => p.type === "text" && p.text.includes("OPENHERMES_BOOTSTRAP"))) return
        if (_bootstrapping) return
        _bootstrapping = true
        try {
          const ref = firstUser.parts[0]
          firstUser.parts.unshift({ ...ref, type: "text", text: bootstrap })
        } finally {
          _bootstrapping = false
        }
      } catch (err) {
        log.error("transform error:", err.message)
      }
    }
  }
}
