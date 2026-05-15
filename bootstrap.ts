import path from "node:path"
import fs from "node:fs"
import os from "node:os"
import { fileURLToPath } from "node:url"
import type { Plugin } from "@opencode-ai/plugin"
import { createLogger } from "./lib/logger.ts"
import { getHarnessDir, setHarnessRootForTest, resolveHarnessRoot } from "./lib/harness-resolver.ts"

const log = createLogger("bootstrap")
const sessionLog = createLogger("session")
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const BOOTSTRAP_MARKER = "OPENHERMES_BOOTSTRAP"
const OPENHERMES_AGENT = "OpenHermes"

// Canonical storage under OpenCode's data directory — survives npm updates
let _planStorageOverride: string | undefined
export function setPlanStorageDirForTest(dir: string | undefined): void { _planStorageOverride = dir }
function planStorageDir(): string {
  return _planStorageOverride ?? path.join(os.homedir(), ".local", "share", "opencode", "openhermes", "plans")
}

function getProjectName(projectDir: string): string {
  return path.basename(projectDir)
}

// User skill directories — auto-scanned on every session, survive npm updates
const USER_SKILL_DIRS: ReadonlyArray<string> = [
  path.join(os.homedir(), ".agents", "skills"),
  path.join(os.homedir(), ".config", "opencode", "skills"),
]

export { resolveHarnessRoot, setHarnessRootForTest, getHarnessDir, ensurePlanFile }

function parseFrontmatter(raw: string | undefined): Record<string, string> {
  const frontmatter: Record<string, string> = {}
  if (!raw) return frontmatter
  for (const line of raw.split(/\r?\n/)) {
    const idx = line.indexOf(":")
    if (idx < 0) continue
    const key = line.slice(0, idx).trim()
    const value = line.slice(idx + 1).trim().replace(/^['"]|['"]$/g, "")
    if (key) frontmatter[key] = value
  }
  return frontmatter
}

interface MarkdownDocument {
  frontmatter: Record<string, string>
  body: string
}

function readMarkdownDocument(filePath: string): MarkdownDocument | null {
  if (!fs.existsSync(filePath)) return null
  const source = fs.readFileSync(filePath, "utf8")
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/)
  const frontmatter = parseFrontmatter(match?.[1] ?? "")
  const body = (match ? match[2] : source).trim()
  return { frontmatter, body }
}

interface DirEntry extends MarkdownDocument {
  name: string
}

function readMarkdownDirectory(dir: string): DirEntry[] {
  if (!fs.existsSync(dir)) return []
  return fs.readdirSync(dir)
    .filter(name => name.endsWith(".md") && name.toLowerCase() !== "readme.md")
    .sort((a, b) => a.localeCompare(b))
    .map(name => {
      const filePath = path.join(dir, name)
      const document = readMarkdownDocument(filePath)
      return document ? { name: path.basename(name, ".md"), ...document } : null
    })
    .filter((e): e is DirEntry => e !== null)
}

interface CommandDef {
  description: string
  template: string
  agent?: string
  model?: string
  subtask?: boolean
}

function commandDefinitions(dir: string): Record<string, CommandDef> {
  const commands: Record<string, CommandDef> = {}
  for (const doc of readMarkdownDirectory(dir)) {
    const command: CommandDef = {
      description: doc.frontmatter.description || `OpenHermes command ${doc.name}`,
      template: doc.body,
    }
    if (doc.frontmatter.agent) command.agent = doc.frontmatter.agent
    if (doc.frontmatter.model) command.model = doc.frontmatter.model
    if (doc.frontmatter.subtask) command.subtask = doc.frontmatter.subtask === "true"
    commands[doc.name] = command
  }
  return commands
}

interface AgentDef {
  description: string
  mode: string
  prompt: string
}

function agentDefinitions(dir: string): Record<string, AgentDef> {
  const agents: Record<string, AgentDef> = {}
  for (const doc of readMarkdownDirectory(dir)) {
    const name = doc.name === "openhermes" ? OPENHERMES_AGENT : doc.name
    agents[name] = {
      description: doc.frontmatter.description || (name === OPENHERMES_AGENT ? "OpenHermes primary orchestrator" : `OpenHermes agent ${name}`),
      mode: doc.frontmatter.mode || (name === OPENHERMES_AGENT ? "primary" : "subagent"),
      prompt: doc.body,
    }
  }
  return agents
}

function uniqueStrings(existing: string[] = [], additions: string[] = []): string[] {
  const seen = new Set(existing.filter(Boolean))
  const merged = [...existing]
  for (const item of additions) {
    if (!item || seen.has(item)) continue
    seen.add(item)
    merged.push(item)
  }
  return merged
}

function readText(filePath: string): string {
  return fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8") : ""
}

function regexEscape(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

function findLatestPlanFile(projectDir: string): string | null {
  const projectName = getProjectName(projectDir)
  const storage = planStorageDir()
  if (!fs.existsSync(storage)) return null
  const pattern = new RegExp(`^${regexEscape(projectName)}-plan-(\\d{3})\\.md$`)
  let latest: string | null = null
  let highest = -1
  try {
    for (const entry of fs.readdirSync(storage)) {
      const m = entry.match(pattern)
      if (m) {
        const n = parseInt(m[1], 10)
        if (n > highest) {
          highest = n
          latest = path.join(storage, entry)
        }
      }
    }
  } catch {
    return null
  }
  return latest
}

function readPlanFromFile(filePath: string): string | null {
  if (!fs.existsSync(filePath)) return null
  const source = fs.readFileSync(filePath, "utf8")
  const status = source.match(/^Status:\s*(.+)$/m)?.[1]?.trim()
  const objective = source.match(/^Objective:\s*(.+)$/m)?.[1]?.trim()
  if (!status && !objective) return null
  const parts = [status ? `status=${status}` : null, objective ? `objective=${objective}` : null].filter(Boolean)
  return `Active plan: ${parts.join(" | ")}`
}

function readPlanSummary(projectDir: string): string | null {
  const planFile = findLatestPlanFile(projectDir)
  if (!planFile) return null
  return readPlanFromFile(planFile)
}

function ensureDir(dir: string): void {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
}

/**
 * Ensure a plan file exists for the project.
 * Creates a skeleton plan if none exists or if the latest is complete/abandoned.
 * Reuses an existing active or in-progress plan.
 * Returns the path to the plan file.
 */
function ensurePlanFile(projectDir: string): string {
  const projectName = getProjectName(projectDir)
  const storage = planStorageDir()
  ensureDir(storage)

  // Reuse active or in-progress plan
  const latest = findLatestPlanFile(projectDir)
  if (latest) {
    const content = fs.readFileSync(latest, "utf8")
    const status = content.match(/^Status:\s*(.+)$/m)?.[1]?.trim()
    if (status === "active" || status === "in-progress") {
      return latest
    }
  }

  // Determine next sequence number
  let nextSeq = 1
  if (latest) {
    const m = path.basename(latest).match(/-plan-(\d{3})\.md$/)
    if (m) nextSeq = parseInt(m[1], 10) + 1
  }

  const planId = `${projectName}-plan-${String(nextSeq).padStart(3, "0")}`
  const planPath = path.join(storage, `${planId}.md`)
  const now = new Date().toISOString().replace("T", " ").slice(0, 16)

  const content = [
    `# PLAN: ${projectName}`,
    "",
    `Plan ID: ${planId}`,
    `Project: ${projectName}`,
    `Status: active`,
    `Created: ${now}`,
    `Updated: ${now}`,
    `Project Path: ${projectDir}`,
    `Plan Path: ${planPath}`,
    `Objective: (pending classification)`,
    "",
    "## Tasks",
    "",
    "- [ ] (discoverable — pending classification)",
    "",
  ].join("\n")

  fs.writeFileSync(planPath, content, "utf8")
  log.info(`created plan file: ${planPath}`)
  return planPath
}

function countSkills(dir: string): number {
  try {
    return fs.readdirSync(dir).filter(e => {
      const full = path.join(dir, e)
      return fs.statSync(full).isDirectory() && fs.existsSync(path.join(full, "SKILL.md"))
    }).length
  } catch {
    return 0
  }
}

export function buildCompactionContext(projectDir: string): string[] {
  const context = [
    "OpenHermes: native-first, verify before claim, always delegate, concise over verbose.",
    "Preserve domain terms: skill, command, agent, bootstrap, compaction.",
    "Preserve blockers, current task, and next steps; do not invent durable state.",
  ]

  const planSummary = readPlanSummary(projectDir)
  if (planSummary) context.push(planSummary)

  return context
}

type SessionLifecycleEvent =
  | { type: "session.created"; properties: { info: { id: string } } }
  | { type: "session.compacted"; properties: { sessionID: string } }
  | { type: "session.error"; properties: { sessionID?: string; error?: unknown } }

function readErrorMessage(error: unknown): string {
  if (!error || typeof error !== "object") return "unknown error"
  const value = error as { name?: unknown; message?: unknown; data?: { message?: unknown } }
  const name = typeof value.name === "string" && value.name ? value.name : "Error"
  const message = typeof value.data?.message === "string" && value.data.message ? value.data.message : typeof value.message === "string" && value.message ? value.message : ""
  return message ? `${name}: ${message}` : name
}

export function formatSessionEvent(event: SessionLifecycleEvent): { level: "info" | "error"; message: string } | null {
  switch (event.type) {
    case "session.created":
      return { level: "info", message: `session.created session=${event.properties.info.id}` }
    case "session.compacted":
      return { level: "info", message: `session.compacted session=${event.properties.sessionID}` }
    case "session.error":
      return { level: "error", message: `session.error session=${event.properties.sessionID ?? "unknown"} error=${readErrorMessage(event.properties.error)}` }
    default:
      return null
  }
}

function parseRouteYaml(raw: string): { pass: string; fail: string; blocker: string } {
  const def: { pass: string; fail: string; blocker: string } = { pass: "surface", fail: "surface", blocker: "surface" }
  const m = raw.match(/route:\n((?:  [^\n]*\n?)*)/)
  if (!m) return def
  const block = m[1]

  const kv = (key: string): string | undefined => {
    // Single-line:  pass: oh-builder  (horizontal whitespace only, no newlines)
    const s = block.match(new RegExp(`  ${key}:[ \\t]*(\\S.*)`))
    if (s) return s[1].trim()
    // Multi-line array:  pass:\n    - oh-builder\n    - oh-gauntlet
    const a = block.match(new RegExp(`  ${key}:\\n((?:    - .+\\n?)*)`))
    if (a) {
      const items = a[1].match(/    - (.+)/g)?.map(i => i.replace(/    - /, "").trim()) ?? []
      return items.length > 0 ? `[${items.join(", ")}]` : undefined
    }
    return undefined
  }

  const p = kv("pass")
  const f = kv("fail")
  const b = kv("blocker")
  if (p) def.pass = p
  if (f) def.fail = f
  if (b) def.blocker = b
  return def
}

function buildRoutingInventory(skillDirs: string[]): string {
  const rows: string[] = []
  for (const dir of skillDirs) {
    let entries: string[] = []
    try { entries = fs.readdirSync(dir).filter(e => fs.statSync(path.join(dir, e)).isDirectory()) } catch { continue }
    for (const name of entries.sort()) {
      const skPath = path.join(dir, name, "SKILL.md")
      if (!fs.existsSync(skPath)) continue
      const raw = fs.readFileSync(skPath, "utf8").replace(/\r\n/g, "\n")
      const fm = raw.match(/^---\n([\s\S]*?)\n---/)
      if (!fm) continue
      const route = parseRouteYaml(fm[1])
      rows.push(`| **${name}** | ${route.pass} | ${route.fail} | ${route.blocker} |`)
    }
  }
  if (rows.length === 0) return ""
  const header = "## Dynamic Routing Inventory\n\nAll skills and their routes:\n\n| Skill | pass | fail | blocker |\n|---|---|---|---|\n"
  return header + rows.join("\n")
}

function buildBootstrapContent(hDir: string, extraDirs: string[] = []): string {
  const parts = [
    `<${BOOTSTRAP_MARKER}>`,
    `You are OpenHermes.`,
    `OpenHermes is OpenCode-native: load skills on demand, always delegate, never execute tasks directly, and keep the surface small.`,
    `Durable state is removed for now. Do not invent a persistence layer unless the user explicitly asks for one later.`,
  ]

  const autopilot = readText(path.join(hDir, "codex", "AUTOPILOT.md"))
  const constitution = readText(path.join(hDir, "codex", "CONSTITUTION.md"))
  const runtime = readText(path.join(hDir, "instructions", "RUNTIME.md"))
  const context = readText(path.join(__dirname, "CONTEXT.md"))
  const ethos = readText(path.join(__dirname, "ETHOS.md"))

  if (autopilot) parts.push(`<AUTOPILOT>\n${autopilot}\n</AUTOPILOT>`)
  if (constitution) parts.push(`<CONSTITUTION>\n${constitution}\n</CONSTITUTION>`)
  if (runtime) parts.push(`<RUNTIME>\n${runtime}\n</RUNTIME>`)
  if (context) parts.push(`<CONTEXT>\n${context}\n</CONTEXT>`)
  if (ethos) parts.push(`<ETHOS>\n${ethos}\n</ETHOS>`)

  // Dynamic routing inventory: built-in skills + user skills
  const allSkillDirs = [path.join(hDir, "skills"), ...extraDirs.filter(Boolean)]
  const inventory = buildRoutingInventory(allSkillDirs)
  if (inventory) parts.push(inventory)

  parts.push(`</${BOOTSTRAP_MARKER}>`)

  return parts.join("\n\n")
}

interface OpenHermesConfig {
  skills?: { paths?: string[] }
  command?: Record<string, unknown>
  agent?: Record<string, unknown>
  instructions?: string[]
  default_agent?: string
}

export const BootstrapPlugin: Plugin = async (ctx) => {
  const hDir = getHarnessDir()
  const skillsDir = path.join(hDir, "skills")
  const commandsDir = path.join(hDir, "commands")
  const agentsDir = path.join(hDir, "agents")
  // Auto-detect and wire user skills from ~/.agents/skills and ~/.config/opencode/skills
  // (Must happen before bootstrapContent is built so routing inventory includes user skills)
  const userSkillPaths: string[] = []
  for (const userDir of USER_SKILL_DIRS) {
    ensureDir(userDir)
    const count = countSkills(userDir)
    if (count > 0) {
      userSkillPaths.push(userDir)
      log.info(`found ${count} user skill(s) in ${userDir}`)
    }
  }

  const bootstrapContent = buildBootstrapContent(hDir, userSkillPaths)
  const compactionContext = buildCompactionContext(ctx.directory)
  const builtInCount = countSkills(skillsDir)
  const userCount = userSkillPaths.reduce((sum, d) => sum + countSkills(d), 0)

  // Ensure plan storage exists
  ensureDir(planStorageDir())

  return {
    config: async (config: OpenHermesConfig) => {
      config.skills = config.skills || {}
      // Built-in paths first, user paths last → user skills override built-in on name conflict
      const allPaths = [skillsDir, ...userSkillPaths]
      config.skills.paths = uniqueStrings(config.skills.paths || [], allPaths)

      log.info(`skills: ${builtInCount} built-in + ${userCount} user (${allPaths.length} path(s))`)

      config.command = { ...(config.command ?? {}), ...commandDefinitions(commandsDir) }

      const loadedAgents = agentDefinitions(agentsDir)
      const openHermesAgent = loadedAgents[OPENHERMES_AGENT] ?? {
        description: "OpenHermes primary orchestrator",
        mode: "primary",
        prompt: "You are OpenHermes.",
      }

      config.agent = {
        ...(config.agent ?? {}),
        ...loadedAgents,
        [OPENHERMES_AGENT]: {
          ...openHermesAgent,
          description: openHermesAgent.description || "OpenHermes primary orchestrator",
          mode: "primary",
          permission: {
            bash: { "*": "allow" },
            edit: "allow",
            read: "allow",
            task: { "*": "allow" },
          },
        },
      }

      config.default_agent = OPENHERMES_AGENT
    },

    event: async ({ event }) => {
      const typed = event as SessionLifecycleEvent
      const record = formatSessionEvent(typed)
      if (!record) return
      sessionLog[record.level](record.message)

      // Structural guard: ensure plan file exists on session start
      if (typed.type === "session.created") {
        ensurePlanFile(ctx.directory)
      }
    },

    "experimental.session.compacting": async (_input, output) => {
      output.context.push(...compactionContext)
    },

    "experimental.chat.messages.transform": async (_input: unknown, output: { messages?: Array<{ info?: { role?: string }; parts?: Array<{ text?: string; type?: string }> }> }) => {
      try {
        if (!output.messages?.length) return
        const firstUser = output.messages.find(m => m?.info?.role === "user")
        if (!firstUser?.parts?.length) return
        if (firstUser.parts.some(p => p.text?.includes(BOOTSTRAP_MARKER))) return
        firstUser.parts.unshift({ type: "text", text: bootstrapContent })
      } catch (err: unknown) {
        log.error("transform error:", (err as Error)?.message)
      }
    },
  }
}
