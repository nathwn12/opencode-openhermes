import path from "node:path"
import fs from "node:fs"
import os from "node:os"
import type { Plugin } from "@opencode-ai/plugin"
import { getHarnessDir, setHarnessRootForTest, resolveHarnessRoot } from "./lib/harness-resolver.ts"
import { compose } from "./harness/lib/composer/index.ts"
import { ensurePlanFile, findLatestPlanFile, planStorageDir, setPlanStorageDirForTest, resolvePlanAccess } from "./harness/lib/plans/plan-location.ts"
import { clearRuntimeRouteDecision, consumeRouteGuidance, getRuntimeRouteDecision, rememberRuntimeRouteDecision } from "./harness/lib/routing/index.ts"

// Hook system — pluggable lifecycle hooks with topological sort
import {
  HookRegistry,
  HookResult,
  nextRouteHook,
  planCheckHook,
  shellDetectHook,
  confidenceGateHook,
  delegationDepthHook,
  resetDepthTracker,
  dynamicRouteHook,
  routeTrackingHook,
  DEFAULT_GUARD_CONFIG,
} from "./harness/lib/hooks/index.ts"
import type { HookContext } from "./harness/lib/hooks/index.ts"

const OPENHERMES_AGENT = "OpenHermes"

// User skill directories — auto-discovered on every session, survive npm updates
const USER_SKILL_DIRS: ReadonlyArray<string> = [
  path.join(os.homedir(), ".agents", "skills"),
  path.join(os.homedir(), ".config", "opencode", "skills"),
  path.join(os.homedir(), ".claude", "skills"),      // Claude Code backward compat
]

export { resolveHarnessRoot, setHarnessRootForTest, getHarnessDir, ensurePlanFile, findLatestPlanFile, setPlanStorageDirForTest }

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

export function buildCompactionContext(projectDir: string): string[] {
  const context = [
    "OpenHermes: native-first, verify before claim, always delegate, concise over verbose.",
    "Preserve domain terms: skill, command, agent, bootstrap, compaction.",
    "Preserve blockers, current task, and next steps; do not invent durable state.",
  ]

  const planSummary = resolvePlanAccess(projectDir)?.summary
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
      const experimental = config.experimental as Record<string, unknown> | undefined;
      const hooksConfig = (experimental?.hooks as
        | Record<string, boolean>
        | undefined)
      const hooksEnabled = (hooksConfig?.enabled ?? true) as boolean

      if (hooksEnabled) {
        const reg = HookRegistry.getInstance()

        // Check individual hook flags (default: true if not specified)
        if (hooksConfig?.plan_check ?? true) reg.registerPreTool(planCheckHook)
        if (hooksConfig?.shell_detect ?? true) reg.registerPreTool(shellDetectHook)
        if (hooksConfig?.delegation_depth ?? true) reg.registerPreTool(delegationDepthHook)
        reg.registerRoute(nextRouteHook)
        if (hooksConfig?.confidence_gate ?? true) reg.registerRoute(confidenceGateHook)
        if (hooksConfig?.dynamic_route ?? true) reg.registerPostTool(dynamicRouteHook)
        if (hooksConfig?.route_tracking ?? true) {
          reg.registerRoute(routeTrackingHook)
        } else {
          reg.unregister("route-tracking")
        }
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
        "oh-builder": { bash: { "*": "allow" }, edit: "allow", read: "allow", glob: "allow", grep: "allow", task: { "oh-*": "deny" } },
        "oh-browser": { bash: { "*": "allow" }, edit: "allow", read: "allow", glob: "allow", grep: "allow", task: { "oh-*": "deny" } },
        "oh-facade": { bash: { "*": "allow" }, edit: "allow", read: "allow", glob: "allow", grep: "allow", task: { "oh-*": "deny" } },
        "oh-fusion": { bash: { "*": "allow" }, edit: "allow", read: "allow", glob: "allow", grep: "allow", task: { "oh-*": "deny" } },
        "oh-gauntlet": { bash: { "*": "allow" }, edit: "allow", read: "allow", glob: "allow", grep: "allow", task: { "oh-*": "deny" } },
        "oh-grill": { bash: { "*": "allow" }, edit: "allow", read: "allow", glob: "allow", grep: "allow", task: { "oh-*": "deny" } },
        "oh-investigate": { bash: { "*": "allow" }, edit: "allow", read: "allow", glob: "allow", grep: "allow", task: { "oh-*": "deny" } },
        "oh-manifest": { bash: { "*": "allow" }, edit: "allow", read: "allow", glob: "allow", grep: "allow", task: { "oh-*": "deny" } },
        "oh-plan-review": { bash: { "*": "allow" }, edit: "allow", read: "allow", glob: "allow", grep: "allow", task: { "oh-*": "deny" } },
        "oh-planner": { bash: { "*": "allow" }, edit: "allow", read: "allow", glob: "allow", grep: "allow", task: { "oh-*": "deny" } },
        "oh-refactor": { bash: { "*": "allow" }, edit: "allow", read: "allow", glob: "allow", grep: "allow", task: { "oh-*": "deny" } },
        "oh-retro": { bash: { "*": "allow" }, edit: "allow", read: "allow", glob: "allow", grep: "allow", task: { "oh-*": "deny" } },
        "oh-review": { bash: { "*": "allow" }, edit: "allow", read: "allow", glob: "allow", grep: "allow", task: { "oh-*": "deny" } },
        "oh-security": { bash: { "*": "allow" }, edit: "allow", read: "allow", glob: "allow", grep: "allow", task: { "oh-*": "deny" } },
        "oh-ship": { bash: { "*": "allow" }, edit: "allow", read: "allow", glob: "allow", grep: "allow", task: { "oh-*": "deny" } },
        "oh-skill-craft": { bash: { "*": "allow" }, edit: "allow", read: "allow", glob: "allow", grep: "allow", task: { "oh-*": "deny" } },
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
              "~/.local/share/openhermes/plans/**": "allow",
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
        const pendingNextRoute = getRuntimeRouteDecision(ctx.directory) ?? undefined

        // Build hook context from input and current session state
        const hookContext: HookContext = {
          sessionId: ctx.directory,           // project directory as session key
          agent: agentName,
          directory: ctx.directory,
          sessions: new Map(),
          _confidenceLevel: typeof inputAny.confidence === "string" ? inputAny.confidence : undefined,
          _confidenceExchanges: 0,
          _guardConfig: DEFAULT_GUARD_CONFIG,
          _nextRoute: pendingNextRoute,
          _routingSkillsDir: skillsDir,
        }

        // Run all registered PreToolUse hooks (plan check, shell detect, delegation depth)
        let preToolResult: { result: HookResult; modifiedContext?: HookContext }
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
            ?? `LOOP GUARD: Delegation depth exceeded (max ${DEFAULT_GUARD_CONFIG.maxDelegationDepth}). ` +
               "Surface to orchestrator with findings and stop delegating."
          errOutput.content = [{ type: "text", text: message }]
          return
        }

        // Handle INJECT from PreTool hooks (e.g. plan check wants a plan first)
        if (preToolResult.result === HookResult.INJECT) {
          const planInstruction = preToolResult.modifiedContext?._planCheckInstruction as string | undefined
          if (planInstruction) {
            // Plan check hook returned INJECT — inject "create plan" instruction
            const inputAny = input as Record<string, unknown>
            const existingPrompt = (inputAny.description as string) || (inputAny.prompt as string) || ""
            if (inputAny.description) {
              inputAny.description = `${planInstruction}\n\n${existingPrompt}`
            } else if (inputAny.prompt) {
              inputAny.prompt = `${planInstruction}\n\n${existingPrompt}`
            } else {
              inputAny.description = planInstruction
            }
            await logToOC("info", `Plan check: injected plan creation instruction into task for "${agentName}"`)
          } else {
            // Generic INJECT — hooks modified task context
            await logToOC("debug", `PreTool INJECT: hooks modified task context for "${agentName}"`)
          }
          // Continue execution — INJECT is not a stop signal
        }

        // Run all registered RouteHooks — the agent/skill being delegated to IS the route
        // This fires confidence-gate (inject confirm/question on MEDIUM/LOW confidence)
        // and route-tracking (guard against infinite routing loops)
        let routeResult: { result: HookResult; modifiedRoute?: string }
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
          const optiReport = hookContext._optiRoute
            ? JSON.stringify(hookContext._optiRoute, null, 2)
            : "Route guard: Excessive or unproductive routing detected."
          errOutput.content = [{ type: "text", text: `ROUTE GUARD: ${optiReport}\n\nSurface to orchestrator with findings and stop delegating.` }]
        }

        if (routeResult.modifiedRoute) {
          const concreteRoute = routeResult.modifiedRoute.split("?")[0] ?? routeResult.modifiedRoute
          if (concreteRoute && concreteRoute !== agentName) {
            inputAny.agent = concreteRoute
          }
          if (pendingNextRoute?.selected && concreteRoute === pendingNextRoute.selected) {
            clearRuntimeRouteDecision(ctx.directory)
          }
        }

        if (routeResult.result === HookResult.INJECT && routeResult.modifiedRoute) {
          // Confidence gate wants to inject a confirmation/pause into routing.
          // Parse the modifiedRoute for markers and inject into task description/prompt.
          const modifiedRoute: string = routeResult.modifiedRoute
          const inputAny = input as Record<string, unknown>
          const existingPrompt = (inputAny.description as string) || (inputAny.prompt as string) || ""
          let gateMsg: string | undefined

          if (modifiedRoute.includes("?echo=confirm")) {
            gateMsg = "[CONFIDENCE: MEDIUM] Review your plan and confirm it before executing."
          } else if (modifiedRoute.includes("?question=pause")) {
            gateMsg = "[CONFIDENCE: LOW] Pause and ask the user for approval before proceeding."
          }

          if (gateMsg) {
            if (inputAny.description) {
              inputAny.description = `${gateMsg}\n${existingPrompt}`
            } else if (inputAny.prompt) {
              inputAny.prompt = `${gateMsg}\n${existingPrompt}`
            } else {
              inputAny.description = gateMsg
            }
            await logToOC("info", `Confidence gate: injected instruction into task to "${agentName}": ${gateMsg}`)
          }
        }
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
        const hookContext: HookContext = {
          sessionId: ctx.directory,
          agent: agentName,
          directory: ctx.directory,
          sessions: new Map(),
          _confidenceLevel: typeof inputAny.confidence === "string" ? inputAny.confidence : undefined,
          _confidenceExchanges: 0,
          _guardConfig: DEFAULT_GUARD_CONFIG,
          _routingSkillsDir: skillsDir,
        }
 
        // Extract output text from tool result
        // output.content may be array of content blocks, or a string, or undefined
        const outputAny = output as Record<string, unknown> | undefined
        const mutableOutput = (output ?? {}) as Record<string, unknown>
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
          const postToolResult = await reg.executePostTool(hookContext, outputText)

          // Log when hooks signal issues (INJECT = anomaly/error detected by a hook)
          if (postToolResult.result === HookResult.INJECT) {
            await logToOC("warn", "PostTool INJECT: hooks detected issues in tool output")
          }

          const routedOutput = consumeRouteGuidance(postToolResult.modifiedOutput ?? outputText)
          const finalOutput = routedOutput.output
          const runtimeNextRoute = rememberRuntimeRouteDecision(ctx.directory, finalOutput)

          if (finalOutput !== outputText) {
            if (typeof outputAny?.content === "string") {
              mutableOutput.content = finalOutput
            } else {
              mutableOutput.content = [{ type: "text", text: finalOutput }]
            }
          }

          if (runtimeNextRoute) {
            mutableOutput._nextRoute = runtimeNextRoute
          }

        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err)
          await logToOC("error", `Hook error (PostTool): ${msg}`)
          // Non-fatal — tool already executed
        }
      }
    },

  }
}

