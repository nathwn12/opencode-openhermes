import fs from "node:fs"
import path from "node:path"
import os from "node:os"

const GLOBAL_DIR = path.join(os.homedir(), ".config", "opencode")
const GLOBAL_PATH = path.join(GLOBAL_DIR, "ohc.json")
const GLOBAL_PATH_JSONC = path.join(GLOBAL_DIR, "ohc.jsonc")

const DEFAULTS = {
  enabled: true,
  preset: "default",
  notification: "chat",
  notificationMode: "detailed",
  max: 150000,
  min: 50000,
  modelMaxLimits: {},
  modelMinLimits: {},
  manualMode: { enabled: false, automaticStrategies: true },
  turnProtection: { enabled: false, turns: 4 },
  protectedFilePatterns: [],
  compress: {
    nudgeFrequency: 5,
    iterationNudgeThreshold: 25,
    nudgeForce: "soft",
    protectedTools: ["task", "skill", "todowrite", "todoread"],
    protectUserMessages: false,
    summaryBuffer: true,
  },
  strategies: {
    deduplication: { enabled: true, protectedTools: [] },
    purgeErrors: { enabled: true, turns: 4, protectedTools: [] },
  },
}

function getDefaultJsoncContent(cfg) {
  const e = v => JSON.stringify(v)
  return `{
  // ── OHC (OpenHermes Context) Pruner Configuration ──
  // Controls automatic conversation compression to stay within model limits.
  // Values shown are defaults. Edit as needed. Comments are valid JSONC.

  "enabled": ${e(cfg.enabled)},                               // Master switch — false disables all auto-pruning
  "preset": ${e(cfg.preset)},                                 // "safe" | "default" | "max"
  "notification": ${e(cfg.notification)},                     // "chat" (in-conversation) | "toast" (TUI popup)
  "notificationMode": ${e(cfg.notificationMode)},             // "detailed" (token stats) | "minimal" (brief)
  "max": ${e(cfg.max)},                                       // Token threshold → compression action
  "min": ${e(cfg.min)},                                       // Below this → OHC stays idle
  "modelMaxLimits": ${e(cfg.modelMaxLimits)},                 // Per-model max: { "model-name": number|"X%" }
  "modelMinLimits": ${e(cfg.modelMinLimits)},                 // Per-model min override
  "manualMode": {
    "enabled": ${e(cfg.manualMode.enabled)},                  // true = user triggers compression only
    "automaticStrategies": ${e(cfg.manualMode.automaticStrategies)} // Run dedup/error purge even in manual mode
  },
  "turnProtection": {
    "enabled": ${e(cfg.turnProtection.enabled)},              // Protect recent N turns from pruning
    "turns": ${e(cfg.turnProtection.turns)}                   // Number of recent turns to protect
  },
  "protectedFilePatterns": ${e(cfg.protectedFilePatterns)},   // Glob patterns: matching file content never pruned
  "compress": {
    "nudgeFrequency": ${e(cfg.compress.nudgeFrequency)},              // Prompt user every N turns
    "iterationNudgeThreshold": ${e(cfg.compress.iterationNudgeThreshold)}, // Force-compress after N ignored nudges
    "nudgeForce": ${e(cfg.compress.nudgeForce)},                      // "soft" (suggest) | "strong" (demand)
    "protectedTools": ${e(cfg.compress.protectedTools)},              // Tool outputs never eligible for pruning
    "protectUserMessages": ${e(cfg.compress.protectUserMessages)},    // Never prune user messages
    "summaryBuffer": ${e(cfg.compress.summaryBuffer)}                 // Buffer summaries for coherence
  },
  "strategies": {
    "deduplication": {
      "enabled": ${e(cfg.strategies.deduplication.enabled)},         // Collapse repeated identical tool outputs
      "protectedTools": ${e(cfg.strategies.deduplication.protectedTools)} // Tools excluded from dedup
    },
    "purgeErrors": {
      "enabled": ${e(cfg.strategies.purgeErrors.enabled)},           // Auto-remove error outputs after N turns
      "turns": ${e(cfg.strategies.purgeErrors.turns)},               // Turns before error eligible for purge
      "protectedTools": ${e(cfg.strategies.purgeErrors.protectedTools)} // Tools excluded from error purge
    }
  }
}`
}

const VALID_CONFIG_KEYS = new Set([
  "enabled",
  "preset",
  "notification",
  "notificationMode",
  "max",
  "min",
  "modelMaxLimits",
  "modelMinLimits",
  "manualMode",
  "manualMode.enabled",
  "manualMode.automaticStrategies",
  "turnProtection",
  "turnProtection.enabled",
  "turnProtection.turns",
  "protectedFilePatterns",
  "compress",
  "compress.nudgeFrequency",
  "compress.iterationNudgeThreshold",
  "compress.nudgeForce",
  "compress.protectedTools",
  "compress.protectUserMessages",
  "compress.summaryBuffer",
  "compress.modelMaxLimits",
  "compress.modelMinLimits",
  "strategies",
  "strategies.deduplication",
  "strategies.deduplication.enabled",
  "strategies.deduplication.protectedTools",
  "strategies.purgeErrors",
  "strategies.purgeErrors.enabled",
  "strategies.purgeErrors.turns",
  "strategies.purgeErrors.protectedTools",
])

function getConfigKeyPaths(obj, prefix = "") {
  const keys = []
  for (const key of Object.keys(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key
    keys.push(fullKey)
    if (fullKey === "modelMaxLimits" || fullKey === "modelMinLimits" ||
        fullKey === "compress.modelMaxLimits" || fullKey === "compress.modelMinLimits") {
      continue
    }
    if (obj[key] && typeof obj[key] === "object" && !Array.isArray(obj[key])) {
      keys.push(...getConfigKeyPaths(obj[key], fullKey))
    }
  }
  return keys
}

function findOpencodeDir(startDir) {
  let current = startDir
  while (current && current.length > 3) {
    const candidate = path.join(current, ".opencode")
    if (fs.existsSync(candidate) && fs.statSync(candidate).isDirectory()) {
      return candidate
    }
    const parent = path.dirname(current)
    if (parent === current) break
    current = parent
  }
  return null
}

function loadFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, "utf8").trim()
    if (!content) return null
    if (filePath.endsWith(".jsonc")) {
      const stripped = content
        .replace(/"(?:[^"\\]|\\.)*"|\/\/.*/gm, m => m.startsWith('"') ? m : "")
        .replace(/\/\*[\s\S]*?\*\//g, "")
      return JSON.parse(stripped)
    }
    return JSON.parse(content)
  } catch {
    return null
  }
}

function mergeDeep(base, override) {
  if (!override || typeof override !== "object") return base
  const result = { ...base }
  for (const key of Object.keys(override)) {
    if (override[key] === undefined) continue
    if (typeof override[key] === "object" && !Array.isArray(override[key]) && override[key] !== null) {
      result[key] = mergeDeep(base[key] || {}, override[key])
    } else {
      result[key] = override[key]
    }
  }
  return result
}

function mergeArrays(base, override) {
  if (!override || !Array.isArray(override)) return base
  return [...new Set([...base, ...override])]
}

function mergeManualMode(base, override) {
  if (!override || typeof override !== "object") return base
  return {
    enabled: override.enabled ?? base.enabled,
    automaticStrategies: override.automaticStrategies ?? base.automaticStrategies,
  }
}

function mergeTurnProtection(base, override) {
  if (!override || typeof override !== "object") return base
  return {
    enabled: override.enabled ?? base.enabled,
    turns: override.turns ?? base.turns,
  }
}

function mergeCompress(base, override) {
  if (!override || typeof override !== "object") return base
  return {
    nudgeFrequency: override.nudgeFrequency ?? base.nudgeFrequency,
    iterationNudgeThreshold: override.iterationNudgeThreshold ?? base.iterationNudgeThreshold,
    nudgeForce: override.nudgeForce ?? base.nudgeForce,
    protectedTools: mergeArrays(base.protectedTools, override.protectedTools),
    protectUserMessages: override.protectUserMessages ?? base.protectUserMessages,
    summaryBuffer: override.summaryBuffer ?? base.summaryBuffer,
    modelMaxLimits: override.modelMaxLimits ?? base.modelMaxLimits,
    modelMinLimits: override.modelMinLimits ?? base.modelMinLimits,
  }
}

function mergeStrategies(base, override) {
  if (!override || typeof override !== "object") return base
  return {
    deduplication: {
      enabled: override.deduplication?.enabled ?? base.deduplication.enabled,
      protectedTools: mergeArrays(base.deduplication.protectedTools, override.deduplication?.protectedTools),
    },
    purgeErrors: {
      enabled: override.purgeErrors?.enabled ?? base.purgeErrors.enabled,
      turns: override.purgeErrors?.turns ?? base.purgeErrors.turns,
      protectedTools: mergeArrays(base.purgeErrors.protectedTools, override.purgeErrors?.protectedTools),
    },
  }
}

function mergeLayer(base, data) {
  if (!data) return base
  return {
    enabled: data.enabled ?? base.enabled,
    preset: data.preset ?? base.preset,
    notification: data.notification ?? base.notification,
    notificationMode: data.notificationMode ?? base.notificationMode,
    max: data.max ?? base.max,
    min: data.min ?? base.min,
    modelMaxLimits: data.modelMaxLimits ?? base.modelMaxLimits,
    modelMinLimits: data.modelMinLimits ?? base.modelMinLimits,
    manualMode: mergeManualMode(base.manualMode, data.manualMode),
    turnProtection: mergeTurnProtection(base.turnProtection, data.turnProtection),
    protectedFilePatterns: mergeArrays(base.protectedFilePatterns, data.protectedFilePatterns),
    compress: mergeCompress(base.compress, data.compress),
    strategies: mergeStrategies(base.strategies, data.strategies),
  }
}

function mergePreset(base, override) {
  if (!override || typeof override !== "object") return base
  return override.preset ?? base.preset
}

const PRESET_VALUES = {
  safe: {
    max: 100000,
    min: 50000,
    compress: { nudgeFrequency: 10, iterationNudgeThreshold: 50 },
    strategies: { deduplication: { enabled: false }, purgeErrors: { turns: 8 } },
    turnProtection: { enabled: false, turns: 0 },
  },
  default: {},
  max: {
    max: 200000,
    min: 100000,
    compress: { nudgeFrequency: 2, iterationNudgeThreshold: 10 },
    strategies: { deduplication: { enabled: true }, purgeErrors: { turns: 2 } },
    turnProtection: { enabled: true, turns: 4 },
  },
}

function applyPreset(config) {
  const p = (config.preset || "default").toLowerCase()
  if (p === "default") return
  const values = PRESET_VALUES[p]
  if (!values) return

  if (values.max !== undefined && config.max === DEFAULTS.max) {
    config.max = values.max
  }
  if (values.min !== undefined && config.min === DEFAULTS.min) {
    config.min = values.min
  }

  if (values.compress) {
    if (config.compress.nudgeFrequency === DEFAULTS.compress.nudgeFrequency) {
      config.compress.nudgeFrequency = values.compress.nudgeFrequency
    }
    if (config.compress.iterationNudgeThreshold === DEFAULTS.compress.iterationNudgeThreshold) {
      config.compress.iterationNudgeThreshold = values.compress.iterationNudgeThreshold
    }
  }
  if (values.strategies) {
    if (values.strategies.deduplication?.enabled !== undefined &&
        config.strategies.deduplication.enabled === DEFAULTS.strategies.deduplication.enabled) {
      config.strategies.deduplication.enabled = values.strategies.deduplication.enabled
    }
    if (values.strategies.purgeErrors?.turns !== undefined &&
        config.strategies.purgeErrors.turns === DEFAULTS.strategies.purgeErrors.turns) {
      config.strategies.purgeErrors.turns = values.strategies.purgeErrors.turns
    }
  }
  if (values.turnProtection) {
    if (config.turnProtection.enabled === DEFAULTS.turnProtection.enabled &&
        values.turnProtection.enabled !== undefined) {
      config.turnProtection.enabled = values.turnProtection.enabled
    }
    if (config.turnProtection.turns === DEFAULTS.turnProtection.turns &&
        values.turnProtection.turns !== undefined) {
      config.turnProtection.turns = values.turnProtection.turns
    }
  }
}

export function getInvalidConfigKeys(userConfig) {
  const userKeys = getConfigKeyPaths(userConfig)
  return userKeys.filter(key => !VALID_CONFIG_KEYS.has(key))
}

export function resolveLimitValue(value, modelContextLimit) {
  if (typeof value === "number") return value
  if (typeof value === "string" && value.endsWith("%")) {
    const pct = parseFloat(value)
    return Math.floor((pct / 100) * modelContextLimit)
  }
  return value
}

export function validateConfigTypes(config) {
  const errors = []

  if (config.enabled !== undefined && typeof config.enabled !== "boolean") {
    errors.push({ key: "enabled", expected: "boolean", actual: typeof config.enabled })
  }

  if (config.preset !== undefined) {
    const validPresets = ["safe", "default", "max"]
    if (!validPresets.includes(config.preset)) {
      errors.push({ key: "preset", expected: '"safe" | "default" | "max"', actual: JSON.stringify(config.preset) })
    }
  }

  if (config.notification !== undefined) {
    const validValues = ["chat", "toast"]
    if (!validValues.includes(config.notification)) {
      errors.push({ key: "notification", expected: '"chat" | "toast"', actual: JSON.stringify(config.notification) })
    }
  }

  if (config.notificationMode !== undefined) {
    const validValues = ["detailed", "minimal"]
    if (!validValues.includes(config.notificationMode)) {
      errors.push({ key: "notificationMode", expected: '"detailed" | "minimal"', actual: JSON.stringify(config.notificationMode) })
    }
  }

  if (config.max !== undefined && (typeof config.max !== "number" || config.max <= 0)) {
    errors.push({ key: "max", expected: "positive number", actual: typeof config.max === "number" ? `${config.max}` : typeof config.max })
  }

  if (config.min !== undefined && typeof config.min !== "number") {
    errors.push({ key: "min", expected: "number", actual: typeof config.min })
  }

  const validateModelLimits = (key, limits) => {
    if (limits === undefined) return
    if (typeof limits !== "object" || limits === null || Array.isArray(limits)) {
      errors.push({ key, expected: "Record<string, number | string>", actual: typeof limits })
      return
    }
    for (const [modelKey, limit] of Object.entries(limits)) {
      if (typeof limit !== "number" && !(typeof limit === "string" && /^\d+(?:\.\d+)?%$/.test(limit))) {
        errors.push({ key: `${key}.${modelKey}`, expected: 'number | "X%"', actual: JSON.stringify(limit) })
      }
    }
  }

  validateModelLimits("modelMaxLimits", config.modelMaxLimits)
  validateModelLimits("modelMinLimits", config.modelMinLimits)

  const manualMode = config.manualMode
  if (manualMode !== undefined) {
    if (typeof manualMode !== "object" || manualMode === null || Array.isArray(manualMode)) {
      errors.push({ key: "manualMode", expected: "object", actual: typeof manualMode })
    } else {
      if (manualMode.enabled !== undefined && typeof manualMode.enabled !== "boolean") {
        errors.push({ key: "manualMode.enabled", expected: "boolean", actual: typeof manualMode.enabled })
      }
      if (manualMode.automaticStrategies !== undefined && typeof manualMode.automaticStrategies !== "boolean") {
        errors.push({ key: "manualMode.automaticStrategies", expected: "boolean", actual: typeof manualMode.automaticStrategies })
      }
    }
  }

  const turnProtection = config.turnProtection
  if (turnProtection !== undefined) {
    if (typeof turnProtection !== "object" || turnProtection === null || Array.isArray(turnProtection)) {
      errors.push({ key: "turnProtection", expected: "object", actual: typeof turnProtection })
    } else {
      if (turnProtection.enabled !== undefined && typeof turnProtection.enabled !== "boolean") {
        errors.push({ key: "turnProtection.enabled", expected: "boolean", actual: typeof turnProtection.enabled })
      }
      if (turnProtection.turns !== undefined && typeof turnProtection.turns !== "number") {
        errors.push({ key: "turnProtection.turns", expected: "number", actual: typeof turnProtection.turns })
      }
    }
  }

  if (config.protectedFilePatterns !== undefined) {
    if (!Array.isArray(config.protectedFilePatterns)) {
      errors.push({ key: "protectedFilePatterns", expected: "string[]", actual: typeof config.protectedFilePatterns })
    } else if (!config.protectedFilePatterns.every(v => typeof v === "string")) {
      errors.push({ key: "protectedFilePatterns", expected: "string[]", actual: "non-string entries" })
    }
  }

  const compress = config.compress
  if (compress !== undefined) {
    if (typeof compress !== "object" || compress === null || Array.isArray(compress)) {
      errors.push({ key: "compress", expected: "object", actual: typeof compress })
    } else {
      if (compress.nudgeFrequency !== undefined && typeof compress.nudgeFrequency !== "number") {
        errors.push({ key: "compress.nudgeFrequency", expected: "number", actual: typeof compress.nudgeFrequency })
      }
      if (compress.iterationNudgeThreshold !== undefined && typeof compress.iterationNudgeThreshold !== "number") {
        errors.push({ key: "compress.iterationNudgeThreshold", expected: "number", actual: typeof compress.iterationNudgeThreshold })
      }
      if (compress.nudgeForce !== undefined && compress.nudgeForce !== "strong" && compress.nudgeForce !== "soft") {
        errors.push({ key: "compress.nudgeForce", expected: '"strong" | "soft"', actual: JSON.stringify(compress.nudgeForce) })
      }
      if (compress.protectedTools !== undefined && !Array.isArray(compress.protectedTools)) {
        errors.push({ key: "compress.protectedTools", expected: "string[]", actual: typeof compress.protectedTools })
      }
      if (compress.protectUserMessages !== undefined && typeof compress.protectUserMessages !== "boolean") {
        errors.push({ key: "compress.protectUserMessages", expected: "boolean", actual: typeof compress.protectUserMessages })
      }
      if (compress.summaryBuffer !== undefined && typeof compress.summaryBuffer !== "boolean") {
        errors.push({ key: "compress.summaryBuffer", expected: "boolean", actual: typeof compress.summaryBuffer })
      }
      validateModelLimits("compress.modelMaxLimits", compress.modelMaxLimits)
      validateModelLimits("compress.modelMinLimits", compress.modelMinLimits)
    }
  }

  return errors
}

function showConfigWarnings(ctx, configPath, configData, isProject) {
  if (!ctx?.client?.tui?.showToast) return

  const invalidKeys = getInvalidConfigKeys(configData)
  const typeErrors = validateConfigTypes(configData)

  if (invalidKeys.length === 0 && typeErrors.length === 0) return

  const configType = isProject ? "project config" : "config"
  const messages = []

  if (invalidKeys.length > 0) {
    const keyList = invalidKeys.slice(0, 3).join(", ")
    const suffix = invalidKeys.length > 3 ? ` (+${invalidKeys.length - 3} more)` : ""
    messages.push(`Unknown keys: ${keyList}${suffix}`)
  }

  if (typeErrors.length > 0) {
    for (const err of typeErrors.slice(0, 2)) {
      messages.push(`${err.key}: expected ${err.expected}, got ${err.actual}`)
    }
    if (typeErrors.length > 2) {
      messages.push(`(+${typeErrors.length - 2} more type errors)`)
    }
  }

  setTimeout(() => {
    try {
      ctx.client.tui.showToast({
        body: {
          title: `OHC: ${configType} warning`,
          message: `${configPath}\n${messages.join("\n")}`,
          variant: "warning",
          duration: 7000,
        },
      })
    } catch {}
  }, 7000)
}

export function loadConfig(ctx) {
  let config = { ...DEFAULTS }

  const layers = [
    { path: fs.existsSync(GLOBAL_PATH_JSONC) ? GLOBAL_PATH_JSONC : (fs.existsSync(GLOBAL_PATH) ? GLOBAL_PATH : null), name: "global", isProject: false },
  ]

  const opencodeConfigDir = process.env.OPENCODE_CONFIG_DIR
  if (opencodeConfigDir) {
    const cdJsonc = path.join(opencodeConfigDir, "ohc.jsonc")
    const cdJson = path.join(opencodeConfigDir, "ohc.json")
    const cdPath = fs.existsSync(cdJsonc) ? cdJsonc : (fs.existsSync(cdJson) ? cdJson : null)
    if (cdPath) layers.push({ path: cdPath, name: "configDir", isProject: true })
  }

  if (ctx?.directory) {
    const opencodeDir = findOpencodeDir(ctx.directory)
    if (opencodeDir) {
      const pjJsonc = path.join(opencodeDir, "ohc.jsonc")
      const pjJson = path.join(opencodeDir, "ohc.json")
      const pjPath = fs.existsSync(pjJsonc) ? pjJsonc : (fs.existsSync(pjJson) ? pjJson : null)
      if (pjPath) layers.push({ path: pjPath, name: "project", isProject: true })
    }
  }

  for (const layer of layers) {
    if (!layer.path) continue
    const data = loadFile(layer.path)
    if (data) {
      if (ctx) showConfigWarnings(ctx, layer.path, data, layer.isProject)
      config = mergeLayer(config, data)
    }
  }

  applyPreset(config)

  config.max = typeof config.max === "number" && config.max > 0 ? config.max : DEFAULTS.max
  config.min = typeof config.min === "number" ? Math.max(10000, Math.min(config.min, config.max - 10000)) : DEFAULTS.min

  try { writeDefaults() } catch { /* best-effort */ }

  return config
}

function writeDefaults() {
  fs.mkdirSync(GLOBAL_DIR, { recursive: true })
  if (!fs.existsSync(GLOBAL_PATH) && !fs.existsSync(GLOBAL_PATH_JSONC)) {
    fs.writeFileSync(GLOBAL_PATH_JSONC, getDefaultJsoncContent(DEFAULTS) + "\n", "utf8")
  }
}

export { applyPreset, mergePreset, getDefaultJsoncContent, writeDefaults }
