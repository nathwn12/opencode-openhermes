import path from "node:path"
import fs from "node:fs"
import { fileURLToPath } from "node:url"
import type { Plugin } from "@opencode-ai/plugin"
import { createLogger } from "./lib/logger.ts"
import { getHarnessDir, setHarnessRootForTest, resolveHarnessRoot } from "./lib/harness-resolver.ts"

const log = createLogger("bootstrap")
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const BOOTSTRAP_MARKER = "OPENHERMES_BOOTSTRAP"
const OPENHERMES_AGENT = "OpenHermes"

export { resolveHarnessRoot, setHarnessRootForTest, getHarnessDir }

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

function buildBootstrapContent(hDir: string): string {
  const parts = [
    `<${BOOTSTRAP_MARKER}>`,
    `You are OpenHermes.`,
    `OpenHermes is OpenCode-native: load skills on demand, prefer subagents for substantive work, and keep the surface small.`,
    `Durable state is removed for now. Do not invent a persistence layer unless the user explicitly asks for one later.`,
  ]

  const constitution = readText(path.join(hDir, "codex", "CONSTITUTION.md"))
  const runtime = readText(path.join(hDir, "instructions", "RUNTIME.md"))
  const context = readText(path.join(__dirname, "CONTEXT.md"))
  const ethos = readText(path.join(__dirname, "ETHOS.md"))

  if (constitution) parts.push(`<CONSTITUTION>\n${constitution}\n</CONSTITUTION>`)
  if (runtime) parts.push(`<RUNTIME>\n${runtime}\n</RUNTIME>`)
  if (context) parts.push(`<CONTEXT>\n${context}\n</CONTEXT>`)
  if (ethos) parts.push(`<ETHOS>\n${ethos}\n</ETHOS>`)
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

export const BootstrapPlugin: Plugin = async () => {
  const hDir = getHarnessDir()
  const skillsDir = path.join(hDir, "skills")
  const commandsDir = path.join(hDir, "commands")
  const agentsDir = path.join(hDir, "agents")
  const bootstrapContent = buildBootstrapContent(hDir)

  return {
    config: async (config: OpenHermesConfig) => {
      config.skills = config.skills || {}
      config.skills.paths = uniqueStrings(config.skills.paths || [], [skillsDir])

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

    "experimental.chat.messages.transform": async (_input: unknown, output: { messages?: Array<{ info?: { role?: string }; parts?: Array<{ text?: string }> }> }) => {
      try {
        if (!output.messages?.length) return
        const firstUser = output.messages.find(m => m?.info?.role === "user")
        if (!firstUser?.parts?.length) return
        if (firstUser.parts.some(p => p.text?.includes(BOOTSTRAP_MARKER))) return
        const ref = firstUser.parts[0]
        firstUser.parts.unshift({ ...ref, type: "text", text: bootstrapContent })
      } catch (err: unknown) {
        log.error("transform error:", (err as Error)?.message)
      }
    },
  }
}
