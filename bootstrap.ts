import path from "node:path"
import fs from "node:fs"
import os from "node:os"
import type { Plugin } from "@opencode-ai/plugin"
import { createLogger } from "./lib/logger.ts"
import { getHarnessDir, setHarnessRootForTest, resolveHarnessRoot } from "./lib/harness-resolver.ts"

const log = createLogger("bootstrap")
const sessionLog = createLogger("session")
const OPENHERMES_AGENT = "OpenHermes"

// User skill directories — auto-discovered on every session, survive npm updates
const USER_SKILL_DIRS: ReadonlyArray<string> = [
  path.join(os.homedir(), ".agents", "skills"),
  path.join(os.homedir(), ".config", "opencode", "skills"),
]

// Canonical storage under OpenCode's data directory — survives npm updates
let _planStorageOverride: string | undefined
export function setPlanStorageDirForTest(dir: string | undefined): void { _planStorageOverride = dir }
function planStorageDir(): string {
  return _planStorageOverride ?? path.join(os.homedir(), ".local", "share", "opencode", "openhermes", "plans")
}

function getProjectName(projectDir: string): string {
  return path.basename(projectDir)
}


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
  const userSkillPaths: string[] = []
  for (const userDir of USER_SKILL_DIRS) {
    ensureDir(userDir)
    const count = countSkills(userDir)
    if (count > 0) {
      userSkillPaths.push(userDir)
      log.info(`found ${count} user skill(s) in ${userDir}`)
    }
  }

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

  }
}
