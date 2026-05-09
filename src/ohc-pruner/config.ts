import { existsSync, readFileSync, writeFileSync, mkdirSync, statSync } from "node:fs"
import { join, dirname } from "node:path"
import { homedir } from "node:os"

export type Permission = "ask" | "allow" | "deny"
export type CompressMode = "range" | "message"

export interface CompressConfig {
  mode: CompressMode
  permission: Permission
  showCompression: boolean
  summaryBuffer: boolean
  maxContextLimit: number | `${number}%`
  minContextLimit: number | `${number}%`
  modelMaxLimits?: Record<string, number | `${number}%`>
  modelMinLimits?: Record<string, number | `${number}%`>
  nudgeFrequency: number
  iterationNudgeThreshold: number
  nudgeForce: "strong" | "soft"
  protectedTools: string[]
  protectTags: boolean
  protectUserMessages: boolean
}

export interface CommandsConfig {
  enabled: boolean
  protectedTools: string[]
}

export interface ManualModeConfig {
  enabled: boolean
  automaticStrategies: boolean
}

export interface PurgeErrorsConfig {
  enabled: boolean
  turns: number
  protectedTools: string[]
}

export interface TurnProtectionConfig {
  enabled: boolean
  turns: number
}

export interface ExperimentalConfig {
  allowSubAgents: boolean
  customPrompts: boolean
}

export interface PluginConfig {
  enabled: boolean
  autoUpdate: boolean
  debug: boolean
  pruneNotification: "off" | "minimal" | "detailed"
  pruneNotificationType: "chat" | "toast"
  commands: CommandsConfig
  manualMode: ManualModeConfig
  turnProtection: TurnProtectionConfig
  experimental: ExperimentalConfig
  protectedFilePatterns: string[]
  compress: CompressConfig
  strategies: {
    deduplication: PurgeErrorsConfig
    purgeErrors: PurgeErrorsConfig
  }
}

const DEFAULT_PROTECTED_TOOLS = [
  "task", "skill", "todowrite", "todoread",
  "compress", "batch", "plan_enter", "plan_exit", "write", "edit",
]

const COMPRESS_DEFAULT_PROTECTED_TOOLS = ["task", "skill", "todowrite", "todoread"]

export const DEFAULT_CONFIG: PluginConfig = {
  enabled: true,
  autoUpdate: false,
  debug: false,
  pruneNotification: "detailed",
  pruneNotificationType: "toast",
  commands: {
    enabled: true,
    protectedTools: [...DEFAULT_PROTECTED_TOOLS],
  },
  manualMode: {
    enabled: false,
    automaticStrategies: true,
  },
  turnProtection: {
    enabled: false,
    turns: 4,
  },
  experimental: {
    allowSubAgents: false,
    customPrompts: false,
  },
  protectedFilePatterns: [],
  compress: {
    mode: "range",
    permission: "allow",
    showCompression: false,
    summaryBuffer: true,
    maxContextLimit: 100000,
    minContextLimit: 50000,
    nudgeFrequency: 5,
    iterationNudgeThreshold: 15,
    nudgeForce: "soft",
    protectedTools: [...COMPRESS_DEFAULT_PROTECTED_TOOLS],
    protectTags: false,
    protectUserMessages: false,
  },
  strategies: {
    deduplication: {
      enabled: true,
      protectedTools: [],
      turns: 0,
    },
    purgeErrors: {
      enabled: true,
      turns: 4,
      protectedTools: [],
    },
  },
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === "object" && !Array.isArray(v)
}

function uniqueStrings(arr: unknown[]): string[] {
  return [...new Set((arr || []).filter((v): v is string => typeof v === "string" && v.length > 0))]
}

function cloneDefault(): PluginConfig {
  const d = DEFAULT_CONFIG
  return {
    ...d,
    commands: { ...d.commands, protectedTools: [...d.commands.protectedTools] },
    manualMode: { ...d.manualMode },
    turnProtection: { ...d.turnProtection },
    experimental: { ...d.experimental },
    protectedFilePatterns: [...d.protectedFilePatterns],
    compress: { ...d.compress, protectedTools: [...d.compress.protectedTools] },
    strategies: {
      deduplication: { ...d.strategies.deduplication, protectedTools: [...d.strategies.deduplication.protectedTools] },
      purgeErrors: { ...d.strategies.purgeErrors, protectedTools: [...d.strategies.purgeErrors.protectedTools] },
    },
  }
}

function mergeLayer(config: PluginConfig, data: Record<string, unknown>): PluginConfig {
  if (!isPlainObject(data)) return config
  const next = cloneDefault()
  Object.assign(next, config)

  if (typeof data.enabled === "boolean") next.enabled = data.enabled
  if (typeof data.debug === "boolean") next.debug = data.debug
  if (typeof data.pruneNotification === "string") next.pruneNotification = data.pruneNotification as PluginConfig["pruneNotification"]
  if (typeof data.pruneNotificationType === "string") next.pruneNotificationType = data.pruneNotificationType as PluginConfig["pruneNotificationType"]

  if (isPlainObject(data.commands)) {
    const cd = data.commands
    next.commands.enabled = (typeof cd.enabled === "boolean") ? cd.enabled : config.commands.enabled
    next.commands.protectedTools = uniqueStrings([...config.commands.protectedTools, ...(Array.isArray(cd.protectedTools) ? cd.protectedTools : [])])
  }
  if (isPlainObject(data.manualMode)) {
    const mm = data.manualMode
    if (typeof mm.enabled === "boolean") next.manualMode.enabled = mm.enabled
    if (typeof mm.automaticStrategies === "boolean") next.manualMode.automaticStrategies = mm.automaticStrategies
  }
  if (isPlainObject(data.turnProtection)) {
    const tp = data.turnProtection
    if (typeof tp.enabled === "boolean") next.turnProtection.enabled = tp.enabled
    if (typeof tp.turns === "number") next.turnProtection.turns = tp.turns
  }
  if (isPlainObject(data.experimental)) {
    const ex = data.experimental
    if (typeof ex.allowSubAgents === "boolean") next.experimental.allowSubAgents = ex.allowSubAgents
    if (typeof ex.customPrompts === "boolean") next.experimental.customPrompts = ex.customPrompts
  }
  if (Array.isArray(data.protectedFilePatterns)) {
    next.protectedFilePatterns = uniqueStrings([...config.protectedFilePatterns, ...data.protectedFilePatterns])
  }

  if (isPlainObject(data.compress)) {
    const c = data.compress as Record<string, unknown>
    if (c.mode === "range" || c.mode === "message") next.compress.mode = c.mode as CompressMode
    if (c.permission === "allow" || c.permission === "ask" || c.permission === "deny") next.compress.permission = c.permission as Permission
    if (typeof c.showCompression === "boolean") next.compress.showCompression = c.showCompression
    if (typeof c.summaryBuffer === "boolean") next.compress.summaryBuffer = c.summaryBuffer
    if (c.maxContextLimit !== undefined) next.compress.maxContextLimit = c.maxContextLimit as number | `${number}%`
    if (c.minContextLimit !== undefined) next.compress.minContextLimit = c.minContextLimit as number | `${number}%`
    if (typeof c.nudgeFrequency === "number") next.compress.nudgeFrequency = Math.max(1, Math.floor(c.nudgeFrequency))
    if (typeof c.iterationNudgeThreshold === "number") next.compress.iterationNudgeThreshold = Math.max(1, Math.floor(c.iterationNudgeThreshold))
    if (c.nudgeForce === "strong" || c.nudgeForce === "soft") next.compress.nudgeForce = c.nudgeForce as "strong" | "soft"
    if (Array.isArray(c.protectedTools)) next.compress.protectedTools = uniqueStrings([...config.compress.protectedTools, ...c.protectedTools])
    if (typeof c.protectTags === "boolean") next.compress.protectTags = c.protectTags
    if (typeof c.protectUserMessages === "boolean") next.compress.protectUserMessages = c.protectUserMessages
    if (isPlainObject(c.modelMaxLimits)) next.compress.modelMaxLimits = { ...c.modelMaxLimits } as Record<string, number | `${number}%`>
    if (isPlainObject(c.modelMinLimits)) next.compress.modelMinLimits = { ...c.modelMinLimits } as Record<string, number | `${number}%`>
  }

  if (isPlainObject(data.strategies)) {
    if (isPlainObject(data.strategies)) {
      const strats = data.strategies as Record<string, unknown>
      if (isPlainObject(strats.deduplication)) {
        const dd = strats.deduplication as Record<string, unknown>
        if (typeof dd.enabled === "boolean") next.strategies.deduplication.enabled = dd.enabled
        if (Array.isArray(dd.protectedTools)) next.strategies.deduplication.protectedTools = uniqueStrings([...config.strategies.deduplication.protectedTools, ...dd.protectedTools])
      }
      if (isPlainObject(strats.purgeErrors)) {
        const pe = strats.purgeErrors as Record<string, unknown>
        if (typeof pe.enabled === "boolean") next.strategies.purgeErrors.enabled = pe.enabled
        if (typeof pe.turns === "number") next.strategies.purgeErrors.turns = pe.turns
        if (Array.isArray(pe.protectedTools)) next.strategies.purgeErrors.protectedTools = uniqueStrings([...config.strategies.purgeErrors.protectedTools, ...pe.protectedTools])
      }
    }
  }

  return next
}

const GLOBAL_DIR = join(homedir(), ".config", "opencode")

function findOpencodeDir(start: string): string | null {
  let cur = start
  while (cur.length > 3) {
    const cand = join(cur, ".opencode")
    if (existsSync(cand) && statSync(cand).isDirectory()) return cand
    const parent = dirname(cur)
    if (parent === cur) break
    cur = parent
  }
  return null
}

function loadFile(p: string): Record<string, unknown> | null {
  try {
    const raw = readFileSync(p, "utf8")
    return JSON.parse(raw)
  } catch {
    return null
  }
}

function validateConfigWarnings(config: PluginConfig): string[] {
  const warnings: string[] = []
  if (config.compress.mode !== "range" && config.compress.mode !== "message") {
    warnings.push(`Unknown compress mode "${config.compress.mode}", falling back to "range"`)
  }
  if (config.compress.nudgeFrequency < 1) {
    warnings.push("compress.nudgeFrequency must be >= 1")
  }
  if (config.compress.iterationNudgeThreshold < 1) {
    warnings.push("compress.iterationNudgeThreshold must be >= 1")
  }
  if (config.strategies.purgeErrors.turns < 0) {
    warnings.push("strategies.purgeErrors.turns must be >= 0")
  }
  return warnings
}

export function loadConfig(cwd: string, client: { tui?: { showToast?: (opts: unknown) => Promise<unknown> } }): PluginConfig {
  let config = cloneDefault()

  const configFile = (dir: string) => {
    const jsonc = join(dir, "dcp.jsonc")
    if (existsSync(jsonc)) return jsonc
    const json = join(dir, "dcp.json")
    if (existsSync(json)) return json
    return null
  }

  const globalPath = configFile(GLOBAL_DIR)
  const configDir = process.env.OPENCODE_CONFIG_DIR
    ? configFile(process.env.OPENCODE_CONFIG_DIR)
    : null
  const opencodeDir = cwd ? findOpencodeDir(cwd) : null
  const projectPath = opencodeDir ? configFile(opencodeDir) : null

  for (const p of [globalPath, configDir, projectPath]) {
    if (!p) continue
    const data = loadFile(p)
    if (data) config = mergeLayer(config, data)
  }

  if (!globalPath) {
    try {
      if (!existsSync(GLOBAL_DIR)) mkdirSync(GLOBAL_DIR, { recursive: true })
      writeFileSync(join(GLOBAL_DIR, "dcp.jsonc"),
        JSON.stringify({ $schema: "https://raw.githubusercontent.com/Opencode-DCP/opencode-dynamic-context-pruning/master/dcp.schema.json" }, null, 2) +
        "\n// OpenHermes OHC config — uses upstream dcp.schema.json for field validation\n", "utf8")
    } catch {}
  }

  const warnings = validateConfigWarnings(config)
  for (const w of warnings) {
    try { (client as any)?.tui?.showToast?.({ body: { title: "OHC Config Warning", message: w, variant: "warning", duration: 5000 } }) } catch {}
  }

  return config
}

export function resolveLimit(limit: number | `${number}%` | undefined, modelLimit: number | null, fallback: number): number {
  if (typeof limit === "number" && Number.isFinite(limit)) return limit
  if (typeof limit === "string" && limit.endsWith("%") && typeof modelLimit === "number") {
    const pct = parseFloat(limit)
    if (Number.isFinite(pct)) return Math.round(modelLimit * (pct / 100))
  }
  if (typeof modelLimit === "number" && Number.isFinite(modelLimit)) return modelLimit
  return fallback
}

export function getEffectiveLimit(config: PluginConfig, modelLimit: number | null, field: "maxContextLimit" | "minContextLimit"): number {
  const val = config.compress[field]
  if (typeof val === "number") return val
  return resolveLimit(val as `${number}%`, modelLimit, field === "maxContextLimit" ? 100000 : 50000)
}
