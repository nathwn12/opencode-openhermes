import path from "node:path"
import fs from "node:fs"
import os from "node:os"
import type { Plugin } from "@opencode-ai/plugin"
import { getHarnessDir, setHarnessRootForTest, resolveHarnessRoot } from "./lib/harness-resolver.ts"
import { compose } from "./harness/lib/composer/index.ts"

// Hook system — pluggable lifecycle hooks with topological sort
import {
  HookRegistry,
  HookResult,
  planCheckHook,
  shellDetectHook,
  confidenceGateHook,
  delegationDepthHook,
  resetDepthTracker,
  errorRecoveryHook,
  memorySyncHook,
  sanityCheckHook,
  routeTrackingHook,
} from "./harness/lib/hooks/index.ts"

const OPENHERMES_AGENT = "OpenHermes"

// User skill directories — auto-discovered on every session, survive npm updates
const USER_SKILL_DIRS: ReadonlyArray<string> = [
  path.join(os.homedir(), ".agents", "skills"),
  path.join(os.homedir(), ".config", "opencode", "skills"),
  path.join(os.homedir(), ".claude", "skills"),      // Claude Code backward compat
]

// Canonical storage under OpenCode's data directory — survives npm updates
let _planStorageOverride: string | undefined
export function setPlanStorageDirForTest(dir: string | undefined): void { _planStorageOverride = dir }
function planStorageDir(): string {
  return _planStorageOverride ?? path.join(os.homedir(), ".local", "share", "openhermes", "plans")
}

function getProjectName(projectDir: string): string {
  return path.basename(projectDir)
}

export { resolveHarnessRoot, setHarnessRootForTest, getHarnessDir, ensurePlanFile, findLatestPlanFile }

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


function findLatestPlanFile(projectDir: string): string | null {
  const projectName = getProjectName(projectDir)
  const storage = planStorageDir()
  const projectDirPath = path.join(storage, projectName)
  if (!fs.existsSync(projectDirPath)) return null
  let latest: string | null = null
  let highest = -1
  try {
    for (const entry of fs.readdirSync(projectDirPath)) {
      const m = entry.match(/^plan-(\d{3})\.md$/)
      if (m) {
        const n = parseInt(m[1], 10)
        if (n > highest) {
          highest = n
          latest = path.join(projectDirPath, entry)
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
  try {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error(`[openhermes] Failed to create directory ${dir}: ${msg}`)
    // Don't throw — let the plan system degrade gracefully
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
  const projectDirPath = path.join(storage, projectName)
  ensureDir(projectDirPath)

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
    const m = path.basename(latest).match(/^plan-(\d{3})\.md$/)
    if (m) nextSeq = parseInt(m[1], 10) + 1
  }

  const seq = String(nextSeq).padStart(3, "0")
  const planId = `${projectName}/plan-${seq}.md`
  const planPath = path.join(projectDirPath, `plan-${seq}.md`)
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

  try {
    fs.writeFileSync(planPath, content, "utf8")
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error(`[openhermes] Failed to write plan file ${planPath}: ${msg}`)
    // Don't throw — let the plan system degrade gracefully
  }
  return planPath
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
  [key: string]: unknown  // allow additional SDK properties (experimental, etc.)
}

export const BootstrapPlugin: Plugin = async (ctx) => {
  const hDir = getHarnessDir()
  const skillsDir = path.join(hDir, "skills")
  const commandsDir = path.join(hDir, "commands")
  const agentsDir = path.join(hDir, "agents")
  const client = ctx.client  // SDK client for structured logging

  // Safe logging — uses OpenCode SDK when available, falls back to stdout for tests
  async function logToOC(level: "info" | "warn" | "error" | "debug", message: string): Promise<void> {
    if (client?.app?.log) {
      await client.app.log({ body: { service: "openhermes", level, message } })
    } else {
      console.log(`[openhermes] [${level.toUpperCase()}] ${message}`)
    }
  }

  // Auto-detect and wire user skills from ~/.agents/skills and ~/.config/opencode/skills
  const userSkillPaths: string[] = []
  for (const userDir of USER_SKILL_DIRS) {
    try { ensureDir(userDir) } catch {}
    userSkillPaths.push(userDir)
    await logToOC("info", `wired user skills from ${userDir}`)
  }

  const compactionContext = buildCompactionContext(ctx.directory)
  // Ensure plan storage exists
  try { ensureDir(planStorageDir()) } catch {}

  return {
    config: async (config: OpenHermesConfig) => {
      // ── 1. Hooks System ─────────────────────────────────────────────────
      // Read experimental.hooks config from the raw config object
      const hooksConfig = (config.experimental as Record<string, unknown> | undefined)?.hooks as
        | Record<string, boolean>
        | undefined
      const hooksEnabled = (hooksConfig?.enabled ?? true) as boolean

      if (hooksEnabled) {
        const reg = HookRegistry.getInstance()

        // Check individual hook flags (default: true if not specified)
        if (hooksConfig?.plan_check ?? true) reg.registerPreTool(planCheckHook)
        if (hooksConfig?.shell_detect ?? true) reg.registerPreTool(shellDetectHook)
        if (hooksConfig?.delegation_depth ?? true) reg.registerPreTool(delegationDepthHook)
        if (hooksConfig?.confidence_gate ?? true) reg.registerRoute(confidenceGateHook)
        if (hooksConfig?.error_recovery ?? true) reg.registerPostTool(errorRecoveryHook)
        if (hooksConfig?.memory_sync ?? true) reg.registerPostTool(memorySyncHook)
        if (hooksConfig?.sanity_check ?? true) reg.registerPostTool(sanityCheckHook)
        if (hooksConfig?.route_tracking ?? true) reg.registerRoute(routeTrackingHook)

        await logToOC("info", `hooks: ${reg.getPreToolHooks().length + reg.getPostToolHooks().length + reg.getRouteHooks().length} registered`)
      } else {
        await logToOC("info", "hooks: disabled via config")
      }

      // ── 2. Skills ──────────────────────────────────────────────────────
      config.skills = config.skills || {}
      // Built-in paths first, user paths last → user skills override built-in on name conflict
      const allPaths = [skillsDir, ...userSkillPaths]
      config.skills.paths = uniqueStrings(config.skills.paths || [], allPaths)

      await logToOC("info", `skills: ${allPaths.length} path(s)`)

      // Register harness docs as native OpenCode instructions — no prompt-embedding needed
      config.instructions = uniqueStrings(config.instructions ?? [], [
        path.join(hDir, "codex"),
        path.join(hDir, "instructions"),
      ])

      config.command = { ...(config.command ?? {}), ...commandDefinitions(commandsDir) }

      const loadedAgents = agentDefinitions(agentsDir)
      // Use composer for the OpenHermes agent prompt — assemble from fragments
      let openHermesPrompt: string
      try {
        openHermesPrompt = compose()
      } catch {
        openHermesPrompt = loadedAgents[OPENHERMES_AGENT]?.prompt ?? "You are OpenHermes."
      }
      const openHermesAgent = {
        description: loadedAgents[OPENHERMES_AGENT]?.description ?? "OpenHermes primary orchestrator",
        mode: loadedAgents[OPENHERMES_AGENT]?.mode ?? "primary",
        prompt: openHermesPrompt,
      }

      // Subagent permissions — tier-4 and tier-3 get execution access but cannot spawn orchestrators
      const SUBAGENT_PERMISSIONS: Record<string, Record<string, unknown>> = {
        "oh-ascii":       { bash: "allow", edit: "allow", read: "allow" },
        "oh-builder": { bash: { "*": "allow" }, edit: "allow", read: "allow", glob: "allow", grep: "allow", task: { "oh-*": "deny" } },
        "oh-browser": { bash: { "*": "allow" }, edit: "allow", read: "allow", glob: "allow", grep: "allow", task: { "oh-*": "deny" } },
        "oh-expert":      { bash: "deny", edit: "deny", read: "allow" },
        "oh-facade": { bash: { "*": "allow" }, edit: "allow", read: "allow", glob: "allow", grep: "allow", task: { "oh-*": "deny" } },
        "oh-freeze":      { bash: "deny", edit: "deny", read: "allow" },
        "oh-full-output": { bash: "deny", edit: "deny", read: "allow" },
        "oh-fusion": { bash: { "*": "allow" }, edit: "allow", read: "allow", glob: "allow", grep: "allow", task: { "oh-*": "deny" } },
        "oh-gauntlet": { bash: { "*": "allow" }, edit: "allow", read: "allow", glob: "allow", grep: "allow", task: { "oh-*": "deny" } },
        "oh-grill": { bash: { "*": "allow" }, edit: "allow", read: "allow", glob: "allow", grep: "allow", task: { "oh-*": "deny" } },
        "oh-guard":       { bash: "deny", edit: "deny", read: "allow" },
        "oh-handoff":     { bash: "deny", edit: "allow", read: "allow" },
        "oh-health":      { bash: "allow", edit: "deny", read: "allow" },
        "oh-init":        { bash: "allow", edit: "allow", read: "allow" },
        "oh-investigate": { bash: { "*": "allow" }, edit: "allow", read: "allow", glob: "allow", grep: "allow", task: { "oh-*": "deny" } },
        "oh-issue":       { bash: "allow", edit: "deny", read: "allow" },
        "oh-manifest": { bash: { "*": "allow" }, edit: "allow", read: "allow", glob: "allow", grep: "allow", task: { "oh-*": "deny" } },
        "oh-plan-review": { bash: { "*": "allow" }, edit: "allow", read: "allow", glob: "allow", grep: "allow", task: { "oh-*": "deny" } },
        "oh-planner": { bash: { "*": "allow" }, edit: "allow", read: "allow", glob: "allow", grep: "allow", task: { "oh-*": "deny" } },
        "oh-prd":         { bash: "allow", edit: "allow", read: "allow" },
        "oh-refactor": { bash: { "*": "allow" }, edit: "allow", read: "allow", glob: "allow", grep: "allow", task: { "oh-*": "deny" } },
        "oh-retro": { bash: { "*": "allow" }, edit: "allow", read: "allow", glob: "allow", grep: "allow", task: { "oh-*": "deny" } },
        "oh-review": { bash: { "*": "allow" }, edit: "allow", read: "allow", glob: "allow", grep: "allow", task: { "oh-*": "deny" } },
        "oh-security": { bash: { "*": "allow" }, edit: "allow", read: "allow", glob: "allow", grep: "allow", task: { "oh-*": "deny" } },
        "oh-ship": { bash: { "*": "allow" }, edit: "allow", read: "allow", glob: "allow", grep: "allow", task: { "oh-*": "deny" } },
        "oh-skill-craft": { bash: { "*": "allow" }, edit: "allow", read: "allow", glob: "allow", grep: "allow", task: { "oh-*": "deny" } },
        "oh-skills-link": { bash: "deny", edit: "deny", read: "allow" },
        "oh-skills-list": { bash: "deny", edit: "deny", read: "allow" },
        "oh-triage":      { bash: "deny", edit: "deny", read: "allow" },
        "oh-worktree":    { bash: "allow", edit: "allow", read: "allow" },
      }

      config.agent = {
        ...(config.agent ?? {}),
        ...loadedAgents,
        // Apply permissions + hidden flag to subagents
        ...Object.fromEntries(
          Object.entries(loadedAgents)
            .filter(([name]) => name !== OPENHERMES_AGENT)
            .map(([name, agentDef]) => [
              name,
              {
                ...agentDef,
                permission: SUBAGENT_PERMISSIONS[name] ?? { bash: { "*": "deny" }, edit: "deny", read: "allow" },
                // Hide routing-internal subagents from @-menu
                // Only agents with existing .md files can be hidden — names without files are no-ops
                ...(["oh-planner", "oh-grill", "oh-skill-craft"].includes(name) ? { hidden: true } : {}),
              },
            ])
        ),
        [OPENHERMES_AGENT]: {
          ...openHermesAgent,
          description: openHermesAgent.description || "OpenHermes primary orchestrator",
          mode: "primary",
          steps: 15,                     // Max agentic iterations — prevents runaway loops
          permission: {
            bash: { "*": "deny" },       // CANNOT execute commands
            edit: "deny",                // CANNOT write/edit files
            read: "allow",               // CAN read for classification
            glob: "allow",               // CAN search for files
            grep: "allow",               // CAN search content
            task: { "*": "allow" },      // MUST delegate via subagents
            skill: "allow",              // CAN load skill instructions
            webfetch: "allow",           // CAN fetch docs for context
            question: "allow",           // CAN ask user questions
            websearch: "allow",          // CAN search web for research context
            external_directory: {         // CAN read/write plan files outside worktree
              "~/.local/share/opencode/openhermes/**": "allow",
            },
          },
        },
      }

      config.default_agent = OPENHERMES_AGENT
    },

    event: async ({ event }) => {
      const typed = event as SessionLifecycleEvent
      const record = formatSessionEvent(typed)
      if (!record) return
      await logToOC(record.level, record.message)

      // NOTE: Plan files are NOT auto-created here. The LLM agent
      // creates plans on demand (see Task Flow step 1 in agent prompt).
      // Auto-creation produced ghost skeletons like plan-004.

      // Reset delegation depth on session start/error
      if (typed.type === "session.created" || typed.type === "session.error") {
        resetDepthTracker()
      }
    },

    "experimental.session.compacting": async (_input, output) => {
      output.context.push(...compactionContext)
    },

    // Hook-enabled tool execution — delegates to HookRegistry for lifecycle hooks
    "tool.execute.before": async (input, output) => {
      if (input.tool === "task") {
        const reg = HookRegistry.getInstance()

        // Access optional fields from input (SDK may include these at runtime)
        const inputAny = input as Record<string, unknown>
        const agentName = typeof inputAny.agent === "string" ? inputAny.agent : "unknown"

        // Build hook context from input and current session state
        const hookContext = {
          sessionId: ctx.directory,           // project directory as session key
          agent: agentName,
          directory: ctx.directory,
          sessions: new Map(),
          _confidenceLevel: typeof inputAny.confidence === "string" ? inputAny.confidence : undefined,
          _confidenceExchanges: 0,
          _maxDelegationDepth: 25,
          _routeTrackingConfig: {
            maxSkillRepeats: 5,
            maxUnproductiveHops: 30,    // higher than max delegation depth (25) so depth guard fires first
          },
        }

        // Run all registered PreToolUse hooks (plan check, shell detect, delegation depth)
        let preToolResult: any
        try {
          preToolResult = await reg.executePreTool(hookContext)
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err)
          const errOutput = output as { args: unknown; isError?: boolean; content?: unknown[] }
          errOutput.isError = true
          errOutput.content = [{ type: "text", text: `Hook error (PreTool): ${msg}` }]
          return
        }

        if (preToolResult.result === HookResult.STOP) {
          // Depth exceeded or other stop condition
          const errOutput = output as { args: unknown; isError?: boolean; content?: unknown[] }
          errOutput.isError = true
          const message = (preToolResult.modifiedContext?._depthError as string)
            ?? "LOOP GUARD: Delegation depth exceeded (max 25). " +
               "Surface to orchestrator with findings and stop delegating."
          errOutput.content = [{ type: "text", text: message }]
          return
        }

        // Run all registered RouteHooks — the agent/skill being delegated to IS the route
        // This fires confidence-gate (inject confirm/question on MEDIUM/LOW confidence)
        // and route-tracking (guard against infinite routing loops)
        let routeResult: any
        try {
          routeResult = await reg.executeRoute(hookContext, agentName)
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err)
          await logToOC("error", `Hook error (Route): ${msg}`)
          // Route failed — don't change routing decision, just log
          routeResult = { result: HookResult.CONTINUE }
        }

        if (routeResult.result === HookResult.STOP) {
          // Loop guard triggered by route-tracking hook
          const errOutput = output as { args: unknown; isError?: boolean; content?: unknown[] }
          errOutput.isError = true
          const ctxAny = hookContext as Record<string, unknown>
          const optiReport = ctxAny._optiRoute
            ? JSON.stringify(ctxAny._optiRoute, null, 2)
            : "Route guard: Excessive or unproductive routing detected."
          errOutput.content = [{ type: "text", text: `ROUTE GUARD: ${optiReport}\n\nSurface to orchestrator with findings and stop delegating.` }]
        }

        // Note: INJECT with modifiedRoute from confidence-gate is logged but not
        // acted on here — the task tool is already being invoked on agentName.
        // Full route interception requires SDK-level routing hooks.
      }
    },

    // Hook-enabled post-execution — runs PostToolUse hooks
    "tool.execute.after": async (input, output) => {
      if (input.tool === "task") {
        const reg = HookRegistry.getInstance()

        // Access optional fields from input
        const inputAny = input as Record<string, unknown>
        const agentName = typeof inputAny.agent === "string" ? inputAny.agent : "unknown"

        // Build hook context from input and current session state
        const hookContext = {
          sessionId: ctx.directory,
          agent: agentName,
          directory: ctx.directory,
          sessions: new Map(),
          _confidenceLevel: typeof inputAny.confidence === "string" ? inputAny.confidence : undefined,
          _confidenceExchanges: 0,
          _maxDelegationDepth: 25,
        }
 
        // Extract output text from tool result
        // output.content may be array of content blocks, or a string, or undefined
        const outputAny = output as Record<string, unknown> | undefined
        let outputText = ""
        if (outputAny?.content) {
          const content = outputAny.content
          if (typeof content === "string") {
            outputText = content
          } else if (Array.isArray(content)) {
            outputText = content
              .map((c: Record<string, unknown>) => (typeof c.text === "string" ? c.text : ""))
              .join("\n")
          }
        }

        // Run all registered PostToolUse hooks
        try {
          await reg.executePostTool(hookContext, outputText)
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err)
          await logToOC("error", `Hook error (PostTool): ${msg}`)
          // Non-fatal — tool already executed
        }
      }
    },

  }
}

