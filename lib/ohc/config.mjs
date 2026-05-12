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
    compress: { nudgeFrequency: 10, iterationNudgeThreshold: 50 },
    strategies: { deduplication: { enabled: false }, purgeErrors: { turns: 8 } },
    turnProtection: { enabled: false, turns: 0 },
  },
  default: {},
  max: {
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

export function loadConfig(ctx) {
  let config = { ...DEFAULTS }

  const layers = [
    { path: fs.existsSync(GLOBAL_PATH_JSONC) ? GLOBAL_PATH_JSONC : (fs.existsSync(GLOBAL_PATH) ? GLOBAL_PATH : null), name: "global" },
  ]

  const opencodeConfigDir = process.env.OPENCODE_CONFIG_DIR
  if (opencodeConfigDir) {
    const cdJsonc = path.join(opencodeConfigDir, "ohc.jsonc")
    const cdJson = path.join(opencodeConfigDir, "ohc.json")
    const cdPath = fs.existsSync(cdJsonc) ? cdJsonc : (fs.existsSync(cdJson) ? cdJson : null)
    if (cdPath) layers.push({ path: cdPath, name: "configDir" })
  }

  if (ctx?.directory) {
    const opencodeDir = findOpencodeDir(ctx.directory)
    if (opencodeDir) {
      const pjJsonc = path.join(opencodeDir, "ohc.jsonc")
      const pjJson = path.join(opencodeDir, "ohc.json")
      const pjPath = fs.existsSync(pjJsonc) ? pjJsonc : (fs.existsSync(pjJson) ? pjJson : null)
      if (pjPath) layers.push({ path: pjPath, name: "project" })
    }
  }

  for (const layer of layers) {
    if (!layer.path) continue
    const data = loadFile(layer.path)
    if (data) config = mergeLayer(config, data)
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
    fs.writeFileSync(GLOBAL_PATH, JSON.stringify(DEFAULTS, null, 2) + "\n", "utf8")
  }
}

export { applyPreset, mergePreset }
