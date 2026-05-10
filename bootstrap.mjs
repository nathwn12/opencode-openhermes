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
| **MCP: openhermes-memory** | \`hm_put\`, \`hm_get\`, \`hm_list\`, \`hm_latest\`, \`hm_search\` |
| **Memory recall cache** | \`openhermes/memory/recall/cache.json\` — read on session start, no MCP round-trip |
| **Subagents** | \`explore\` (read-only), \`general\` (multi-step), \`architect\`, \`planner\`, \`build-error-resolver\`, \`code-reviewer\`, \`security-reviewer\`, \`e2e-runner\` |
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
| Any non-trivial multi-step | appropriate specialist |

Never delegate trivial single-step ops. Subagent returns diff + summary + verification; inspect return only. Full ref: \`${RULES_DIR}\\\\delegation.md\`.

## Memory — Gated & Precision-First

- **Start**: Read recall cache first. If stale/missing → \`hm_latest\` for relevant classes.
- **Before work**: Narrow \`hm_search\` by class, scope, keywords. Never read full indexes.
- **Before close**: Query same-type mistakes (7 days). Match → \`code-reviewer\` or \`security-reviewer\`.
- **On failure**: \`hm_search\` for similar incidents. Search memory before asking user.
- **Precision ladder**: \`hm_latest\` → \`hm_search\` → \`hm_get\` → \`hm_list\` (last resort). Full index reads only for explicit audit/repair tasks.
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
- Skill candidates → \`/learn\` only if repeated pattern + \`hm_search\` confirms no dup. See \`${RULES_DIR}\\\\skills-management.md\`.
- Audit triggers: openhermes/config change, repeated failures, session start when last audit >7 days. See \`${RULES_DIR}\\\\audit.md\`.

## Escalation

T0: observe → log mistake → smallest fix. T1: add prevention rule → verify. T2: diagnosis/specialist → backlog. T3: constrained safe mode. Full: \`${RULES_DIR}\\\\self-heal.md\`.

## State

- **Config root**: \`%USERPROFILE%\\\\.config\\\\opencode\`
- **Auth**: \`%USERPROFILE%\\\\.local\\\\share\\\\opencode\\\\auth.json\` (NEVER delete)
- **Forensic ledger**: \`%USERPROFILE%\\\\.local\\\\share\\\\opencode\\\\opencode.db\``

  return [
    `<OPENHERMES_BOOTSTRAP>\nOpenHermes v${getOwnVersion()} active. Harness: \`${HARNESS_DIR}\\\`. Memory at \`~/.config/opencode/openhermes/memory/\`. Rules at \`${RULES_DIR}\\\`. Skills discoverable via \`skill\` tool — use \`skill\` tool to list/load them.`,
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
    name: "openhermes-bootstrap",

    config: async (config) => {
      config.skills = config.skills || {}
      config.skills.paths = config.skills.paths || []
      if (!config.skills.paths.includes(SKILLS_DIR)) {
        config.skills.paths.push(SKILLS_DIR)
      }
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
