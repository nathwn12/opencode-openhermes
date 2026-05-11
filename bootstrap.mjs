import path from "node:path"
import fs from "node:fs"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const HARNESS_DIR = path.resolve(__dirname, "harness")
const RULES_DIR = path.join(HARNESS_DIR, "rules")
const SKILLS_DIR = path.join(HARNESS_DIR, "skills")
const CONSTITUTION_FILE = path.join(HARNESS_DIR, "constitution", "soul.md")
const RUNTIME_FILE = path.join(HARNESS_DIR, "instructions", "RUNTIME.md")


let _bootstrapCache = undefined

function buildBootstrapContent() {
  const constitution = fs.readFileSync(CONSTITUTION_FILE, "utf8")
  const runtime = fs.readFileSync(RUNTIME_FILE, "utf8")

  const router = `## AGENTS.md

OpenHermes thin constitutional router. Full harness → \`${HARNESS_DIR}\\\`.

## Soul

Pragmatic. Concise. Task-oriented. Subagent-first. Inspect, then act. Smallest correct change. Verify, don't claim. Receipts over vibes. Recover by narrowing, not posturing. Skeptical — demand proof. Precision-first search: needle then broad, never reverse.

## Safety

Snapshot before mutation. Never delete unrelated files. Never assume \`%USERPROFILE%\\\\.config\\\\opencode\` is a git repo. Verify or roll back. **NEVER delete \`auth.json\`** (\`%USERPROFILE%\\\\.local\\\\share\\\\opencode\\\\auth.json\`).

## Arsenal

| Category | Items |
|----------|-------|
| **Native tools** | \`read\`, \`write\`, \`edit\`, \`glob\`, \`grep\`, \`bash\`, \`task\`, \`webfetch\`, \`skill\`, \`todowrite\`, \`todoread\` |
| **In-process tools** | \`add_memory\`, \`fetch_memory\`, \`list_memory\`, \`latest_memory\`, \`search_memory\`, \`archive_memory\` |
| **Memory recall cache** | \`openhermes/memory/recall/cache.json\` — read on session start, no MCP round-trip |
| **Subagents** | \`explore\` (read-only), \`general\` (multi-step), \`architect\`, \`planner\`, \`build-error-resolver\`, \`code-reviewer\`, \`security-reviewer\`, \`e2e-runner\`, \`docs-lookup\`, \`doc-updater\`, \`refactor-cleaner\`, \`loop-operator\`, \`harness-optimizer\`, \`tdd-guide\`, \`review-go\`, \`build-go\`, \`review-database\`, \`review-cpp\`, \`build-cpp\`, \`review-java\`, \`build-java\`, \`review-kotlin\`, \`build-kotlin\`, \`review-python\`, \`review-rust\`, \`build-rust\` |
| **Plugins** | \`curator\` (checkpoints, mistakes, audit, compaction), \`autorecall\` (recall cache on \`session.created\`), \`skill-builder\` (complex session detection) |

## Skills (available via \`skill\` tool)

\`agent-browser\` \`batch-files\` \`caveman\` \`create-architectural-decision-record\` \`create-readme\` \`design-md\` \`diagnose\` \`docker-expert\` \`enhance-prompt\` \`find-skills\` \`grill-me\` \`grill-with-docs\` \`improve-codebase-architecture\` \`opencode-doctor\` \`opencode-ecc-lifecycle\` \`opencode-docs\` \`opencode-expert\` \`opencode-models\` \`opencode-recall\` \`react:components\` \`setup-matt-pocock-skills\` \`skill-creator\` \`squeez-expert\` \`stitch-design\` \`stitch-loop\` \`tailored-resume-generator\` \`taste-design\` \`tdd\` \`to-issues\` \`to-prd\` \`triage\` \`typescript-expert\` \`write-a-skill\` \`write-coding-standards-from-file\` \`zoom-out\`

**OpenHermes-specific skills (discovered from harness):** \`api-design\` \`backend-patterns\` \`coding-standards\` \`e2e-testing\` \`frontend-patterns\` \`frontend-slides\` \`security-review\` \`strategic-compact\` \`tdd-workflow\` \`verification-loop\`

## Delegation (Mandatory)

Main context = coordination + verification only. Substantive work → subagent.

| Trigger | Subagent |
|---------|----------|
| Multi-file implementation | \`architect\` or \`planner\` |
| Build/TS error | \`build-error-resolver\` |
| Code review | \`code-reviewer\` |
| Security audit | \`security-reviewer\` |
| E2E testing | \`e2e-runner\` |
| Multi-file search/exploration | \`explore\` or \`general\` |
| Documentation lookup | \`docs-lookup\` |
| Doc/codemap update | \`doc-updater\` |
| Dead code cleanup | \`refactor-cleaner\` |
| TDD workflow | \`tdd-guide\` |
| Autonomous loop | \`loop-operator\` |
| Go review | \`review-go\` |
| Go build fix | \`build-go\` |
| Database review | \`review-database\` |
| C++ review | \`review-cpp\` |
| Java review | \`review-java\` |
| Java build fix | \`build-java\` |
| Kotlin review | \`review-kotlin\` |
| Kotlin build fix | \`build-kotlin\` |
| Python review | \`review-python\` |
| Rust review | \`review-rust\` |
| Rust build fix | \`build-rust\` |
| Any non-trivial multi-step | appropriate specialist |

Never delegate trivial single-step ops. Subagent returns diff + summary + verification; inspect return only. Full ref: \`${RULES_DIR}\\\\delegation.md\`.

## Memory — Gated & Precision-First

- **Start**: Read recall cache first. If stale/missing → \`latest_memory\` for relevant classes.
- **Before work**: Narrow \`search_memory\` by class, scope, keywords. Never read full indexes.
- **Before close**: Query same-type mistakes (7 days). Match → \`code-reviewer\` or \`security-reviewer\`.
- **On failure**: \`search_memory\` for similar incidents. Search memory before asking user.
- **Precision ladder**: \`latest_memory\` → \`search_memory\` → \`fetch_memory\` → \`list_memory\` (last resort). Full index reads only for explicit audit/repair tasks.
- **Anti-spam**: No obvious facts, no one-off prefs, no temp state, no low-risk mistakes. Supersede, don't duplicate. Full rules: \`${RULES_DIR}\\\\retrieval.md\`, \`${RULES_DIR}\\\\memory-management.md\`.

## Self-Edit Authority

| Auto | Conditional | Needs approval |
|------|-------------|----------------|
| Memory entries, mistakes, checkpoints, receipts | openhermes docs/schemas/templates/non-core rules patches | AGENTS.md core, model routing, permissions, config, protected settings |

Full tiers: \`${RULES_DIR}\\\\self-heal.md\`.

## Precedence

1. User instruction. 2. Safety/legal/destructive guard. 3. Constitution (\`${HARNESS_DIR}\\\\constitution\\\`). 4. Project constraints. 5. Project decisions. 6. Verified guards. 7. Checkpoints. 8. Instincts. 9. Freeform notes. Full: \`${RULES_DIR}\\\\precedence.md\`.

## Hygiene

- Checkpoint on meaningful boundaries. Compress closed segments immediately.
- After subagent return: verify → compress that block.
- Compress proactively.
- Skill candidates → \`/learn\` only if repeated pattern + \`search_memory\` confirms no dup. See \`${RULES_DIR}\\\\skills-management.md\`.
- Audit triggers: openhermes/config change, repeated failures, session start when last audit >7 days. See \`${RULES_DIR}\\\\audit.md\`.

## Escalation

T0: observe → log mistake → smallest fix. T1: add prevention rule → verify. T2: diagnosis/specialist → backlog. T3: constrained safe mode. Full: \`${RULES_DIR}\\\\self-heal.md\`.

## State

- **Config root**: \`%USERPROFILE%\\\\.config\\\\opencode\`
- **Auth**: \`%USERPROFILE%\\\\.local\\\\share\\\\opencode\\\\auth.json\` (NEVER delete)
- **Forensic ledger**: \`%USERPROFILE%\\\\.local\\\\share\\\\opencode\\\\opencode.db\``

  return [
    `<OPENHERMES_BOOTSTRAP>\nOpenHermes v${getOwnVersion()} active. Harness: \`${HARNESS_DIR}\\\`. Memory at \`~/.local/share/opencode/openhermes/memory/\`. Rules at \`${RULES_DIR}\\\`. Skills discoverable via \`skill\` tool — use \`skill\` tool to list/load them.`,
    `<OPENHERMES_CONSTITUTION>\n${constitution}\n</OPENHERMES_CONSTITUTION>`,
    `<OPENHERMES_RUNTIME>\n${runtime}\n</OPENHERMES_RUNTIME>`,
    `<OPENHERMES_ROUTER>\n${router}\n</OPENHERMES_ROUTER>`
  ].join("\n\n")
}

function getOwnVersion() {
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, "package.json"), "utf8"))
    return pkg.version || "1.0.0"
  } catch { return "1.0.0" }
}

export const BootstrapPlugin = async ({ client, directory }) => {

  const getContent = () => {
    if (_bootstrapCache !== undefined) return _bootstrapCache
    try {
      _bootstrapCache = buildBootstrapContent()
    } catch (err) {
      console.error("[openhermes-bootstrap] failed to build bootstrap content:", err.message)
      _bootstrapCache = null
    }
    return _bootstrapCache
  }

  return {
    config: async (config) => {
      config.skills = config.skills || {}
      config.skills.paths = config.skills.paths || []
      if (!config.skills.paths.includes(SKILLS_DIR)) {
        config.skills.paths.push(SKILLS_DIR)
      }

      const PROMPTS_DIR = path.join(HARNESS_DIR, "prompts")
      const p = (name) => `{file:${path.join(PROMPTS_DIR, name)}}`
      const COMMANDS_DIR = path.join(HARNESS_DIR, "commands")
      const ct = (file) => `{file:${path.join(COMMANDS_DIR, file)}}\n\n$ARGUMENTS`

      const existingCommands = config.command ?? {}
      const existingAgents = { ...(config.agent ?? {}) }

      config.command = {
        ...existingCommands,
        "build-fix": { agent: "build-error-resolver", description: "Fix build and TypeScript errors", subtask: true, template: ct("build-fix.md") },
        "code-review": { agent: "code-reviewer", description: "Review code for quality, security, and maintainability", subtask: true, template: ct("code-review.md") },
        "plan": { agent: "planner", description: "Create a detailed implementation plan", subtask: true, template: ct("plan.md") },
        "security": { agent: "security-reviewer", description: "Run comprehensive security review", subtask: true, template: ct("security.md") },
        "doctor": { agent: "OpenHermes", description: "Run OpenCode OpenHermes health diagnostics", subtask: true, template: ct("doctor.md") },
        "memory-search": { agent: "OpenHermes", description: "Search OpenHermes memory with LLM summarization", subtask: true, template: ct("memory-search.md") },
        "learn": { agent: "OpenHermes", description: "Create a new skill from recent work patterns", subtask: true, template: ct("learn.md") },
        "ohc": { template: "", description: "OHC context management: /ohc status, /ohc compress [focus]" },
        "orchestrate": { agent: "planner", description: "Orchestrate multiple agents for complex tasks", subtask: true, template: ct("orchestrate.md") },
        "eval": { agent: "planner", description: "Evaluate implementation against acceptance criteria", subtask: true, template: ct("eval.md") },
        "model-route": { agent: "OpenHermes", description: "Recommend model tier by task complexity and budget", subtask: true, template: ct("model-route.md") },
        "quality-gate": { agent: "OpenHermes", description: "Run quality pipeline (format, lint, type check)", subtask: true, template: ct("quality-gate.md") },
        "test-coverage": { agent: "tdd-guide", description: "Analyze coverage reports and identify gaps", subtask: true, template: ct("test-coverage.md") },
        "update-docs": { agent: "doc-updater", description: "Update documentation for recent code changes", subtask: true, template: ct("update-docs.md") },
        "update-codemaps": { agent: "doc-updater", description: "Generate/update architecture codemaps", subtask: true, template: ct("update-codemaps.md") },
        "refactor-clean": { agent: "refactor-cleaner", description: "Remove dead code and consolidate duplicates", subtask: true, template: ct("refactor-clean.md") },
        "verify": { agent: "OpenHermes", description: "Run comprehensive verification loop (typecheck, lint, test, build)", subtask: true, template: ct("verify.md") },
        "checkpoint": { agent: "OpenHermes", description: "Save verification state and progress checkpoint", subtask: true, template: ct("checkpoint.md") },
        "loop-start": { agent: "loop-operator", description: "Start managed autonomous loop with safety defaults", subtask: true, template: ct("loop-start.md") },
        "loop-status": { agent: "OpenHermes", description: "Inspect active loop state, progress, and failure signals", subtask: true, template: ct("loop-status.md") },
        "harness-audit": { agent: "harness-optimizer", description: "Run harness self-audit across 7 categories", subtask: true, template: ct("harness-audit.md") },
        "setup-pm": { agent: "OpenHermes", description: "Configure package manager preference for the project", subtask: true, template: ct("setup-pm.md") },
        "go-build": { agent: "build-go", description: "Fix Go build, vet, and compilation errors", subtask: true, template: ct("go-build.md") },
        "go-review": { agent: "review-go", description: "Review Go code for idiomatic patterns and best practices", subtask: true, template: ct("go-review.md") },
        "rust-build": { agent: "build-rust", description: "Fix Rust build, clippy, and dependency errors", subtask: true, template: ct("rust-build.md") },
        "rust-review": { agent: "review-rust", description: "Review Rust code for safety, ownership, and idioms", subtask: true, template: ct("rust-review.md") },
        "skill-create": { agent: "OpenHermes", description: "Generate a new skill from git history analysis", subtask: true, template: ct("skill-create.md") },
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
        "architect": {
          description: "Software architecture specialist for system design",
          mode: "subagent",
          prompt: p("architect.txt"),
          permission: { read: "allow", edit: "deny", bash: "deny" },
        },
        "build-error-resolver": {
          description: "Build and TypeScript error resolution specialist",
          mode: "subagent",
          prompt: p("build-error-resolver.md"),
          permission: { read: "allow", edit: "allow" },
        },
        "code-reviewer": {
          description: "Expert code review specialist",
          mode: "subagent",
          prompt: p("code-reviewer.md"),
          permission: { read: "allow", edit: "deny", bash: "deny", task: { explore: "allow", "*": "deny" } },
        },
        "e2e-runner": {
          description: "End-to-end testing specialist using Playwright",
          mode: "subagent",
          prompt: p("e2e-runner.txt"),
          permission: { read: "allow", edit: "allow" },
        },
        "explore": {
          description: "Fast read-only codebase exploration agent",
          mode: "subagent",
          prompt: p("explore.md"),
          permission: { read: "allow", grep: "allow", glob: "allow", list: "allow", edit: "deny", bash: "deny" },
        },
        "planner": {
          description: "Expert planning specialist for complex features and refactoring",
          mode: "subagent",
          color: "#3B82F6",
          prompt: p("planner.md"),
          permission: { read: "allow", edit: "deny", bash: "deny" },
        },
        "security-reviewer": {
          description: "Security vulnerability detection and remediation specialist",
          mode: "subagent",
          prompt: p("security-reviewer.md"),
          permission: { read: "allow", edit: "deny", bash: "deny", task: { "*": "allow" } },
        },
        "docs-lookup": {
          description: "Documentation lookup via MCP — query any library docs in real-time",
          mode: "subagent",
          prompt: p("docs-lookup.md"),
          permission: { read: "allow", bash: "allow", edit: "deny" },
        },
        "doc-updater": {
          description: "Documentation and codemap generation/update specialist",
          mode: "subagent",
          prompt: p("doc-updater.md"),
          permission: { read: "allow", edit: "allow", bash: "allow" },
        },
        "refactor-cleaner": {
          description: "Dead code detection and safe removal specialist",
          mode: "subagent",
          prompt: p("refactor-cleaner.md"),
          permission: { read: "allow", edit: "allow" },
        },
        "loop-operator": {
          description: "Autonomous agent loop operator — safe iteration with stop conditions",
          mode: "subagent",
          prompt: p("loop-operator.md"),
          permission: { read: "allow", edit: "allow", bash: "allow", task: { "*": "allow" } },
        },
        "harness-optimizer": {
          description: "OpenHermes harness configuration optimizer — audit, tune, measure",
          mode: "subagent",
          prompt: p("harness-optimizer.md"),
          permission: { read: "allow", bash: "allow", edit: "deny" },
        },
        "tdd-guide": {
          description: "Test-Driven Development coach — red-green-refactor cycle enforcement",
          mode: "subagent",
          prompt: p("tdd-guide.md"),
          permission: { read: "allow", edit: "allow", bash: "allow" },
        },
        "review-go": {
          description: "Go code review specialist — idiomatic Go, concurrency, error handling",
          mode: "subagent",
          prompt: p("review-go.md"),
          permission: { read: "allow", bash: "allow", edit: "deny" },
        },
        "build-go": {
          description: "Go build error resolution specialist — go build, vet, staticcheck fixes",
          mode: "subagent",
          prompt: p("build-go.md"),
          permission: { read: "allow", edit: "allow", bash: "allow" },
        },
        "review-database": {
          description: "PostgreSQL database specialist — query optimization, schema, RLS, indexes",
          mode: "subagent",
          prompt: p("review-database.md"),
          permission: { read: "allow", bash: "allow", edit: "deny" },
        },
        "review-cpp": {
          description: "C++ code review specialist — memory safety, modern C++, RAII",
          mode: "subagent",
          prompt: p("review-cpp.md"),
          permission: { read: "allow", bash: "allow", edit: "deny" },
        },
        "build-cpp": {
          description: "C++ build error resolution specialist — CMake, linker, template errors",
          mode: "subagent",
          prompt: p("build-cpp.md"),
          permission: { read: "allow", edit: "allow", bash: "allow" },
        },
        "review-java": {
          description: "Java/Spring Boot review specialist — JPA, architecture, security",
          mode: "subagent",
          prompt: p("review-java.md"),
          permission: { read: "allow", bash: "allow", edit: "deny" },
        },
        "build-java": {
          description: "Java/Maven/Gradle build error resolution specialist",
          mode: "subagent",
          prompt: p("build-java.md"),
          permission: { read: "allow", edit: "allow", bash: "allow" },
        },
        "review-kotlin": {
          description: "Kotlin/Android review specialist — coroutines, Compose, architecture",
          mode: "subagent",
          prompt: p("review-kotlin.md"),
          permission: { read: "allow", bash: "allow", edit: "deny" },
        },
        "build-kotlin": {
          description: "Kotlin/Gradle build error resolution specialist",
          mode: "subagent",
          prompt: p("build-kotlin.md"),
          permission: { read: "allow", edit: "allow", bash: "allow" },
        },
        "review-python": {
          description: "Python code review specialist — PEP 8, type hints, security",
          mode: "subagent",
          prompt: p("review-python.md"),
          permission: { read: "allow", bash: "allow", edit: "deny" },
        },
        "review-rust": {
          description: "Rust code review specialist — ownership, lifetimes, safety",
          mode: "subagent",
          prompt: p("review-rust.md"),
          permission: { read: "allow", bash: "allow", edit: "deny" },
        },
        "build-rust": {
          description: "Rust build error resolution specialist — cargo, borrow checker, clippy",
          mode: "subagent",
          prompt: p("build-rust.md"),
          permission: { read: "allow", edit: "allow", bash: "allow" },
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
        const ref = firstUser.parts[0]
        firstUser.parts.unshift({ ...ref, type: "text", text: bootstrap })
      } catch (err) {
        console.error("[openhermes-bootstrap] transform error:", err.message)
      }
    }
  }
}
