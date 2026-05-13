import fs from "node:fs"
import path from "node:path"
import os from "node:os"
import { createLogger } from "../logger.mjs"

const log = createLogger("ohc-config")

const GLOBAL_DIR = path.join(os.homedir(), ".config", "opencode")
const GLOBAL_PATH_JSONC = path.join(GLOBAL_DIR, "ohc.jsonc")

const DEFAULTS = {
  enabled: true,
  preset: "default",
  notification: "chat",
  notificationMode: "detailed",
  max: 150000,
  min: 50000,
}

const PRESET_BEHAVIOR = {
  soft:   { triggerRatio: 1.10, targetRatio: 0.75, hardCeiling: false },
  default:{ triggerRatio: 0.95, targetRatio: 0.55, hardCeiling: true  },
  hard:   { triggerRatio: 0.80, targetRatio: 0.35, hardCeiling: true  },
}

function getDefaultJsoncContent(cfg) {
  return `{
  // ── OHC (OpenHermes Context) Pruner Configuration ──
  // Absolute boundaries for automatic conversation compression.
  // No manual mode, no turn protection, no strategies — just hard limits.
  //
  // Presets control aggression within your max/min boundaries:
  //   "soft"    → trigger at ~110% of max (gentle overshoot), compact to ~75%
  //   "default" → trigger at ~95% of max (balanced), compact to ~55%
  //   "hard"    → trigger at ~80% of max (efficient), compact to ~35%
  // User's max/min always respected regardless of preset.

  "enabled": ${JSON.stringify(cfg.enabled)},             // Master switch. false = disable all auto-pruning.
  "preset": ${JSON.stringify(cfg.preset)},               // "soft" | "default" | "hard"
  "notification": ${JSON.stringify(cfg.notification)},   // "chat" | "toast" | "off"
  "notificationMode": ${JSON.stringify(cfg.notificationMode)}, // "detailed" | "minimal"
  "max": ${JSON.stringify(cfg.max)},                     // Hard ceiling — MUST compress when tokens exceed this.
  "min": ${JSON.stringify(cfg.min)}                      // Target floor after compression.
}`
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

function applyPreset(config) {
  const p = (config.preset || "default").toLowerCase()
  const behavior = PRESET_BEHAVIOR[p]
  if (!behavior) return

  config._effectiveMaxTrigger = Math.round(config.max * behavior.triggerRatio)
  config._effectiveTargetFloor = Math.max(10000, Math.round(config.max * behavior.targetRatio))
  config._hardCeiling = behavior.hardCeiling
}

export function loadConfig(ctx) {
  let config = { ...DEFAULTS }
  const globalPath = fs.existsSync(GLOBAL_PATH_JSONC) ? GLOBAL_PATH_JSONC : null

  if (globalPath) {
    const data = loadFile(globalPath)
    if (data) config = { ...config, ...data }
  }

  applyPreset(config)

  config.max = typeof config.max === "number" && config.max > 0 ? config.max : DEFAULTS.max
  config.min = typeof config.min === "number" ? Math.max(10000, Math.min(config.min, config.max - 10000)) : DEFAULTS.min

  if (!config._effectiveMaxTrigger) {
    config._effectiveMaxTrigger = config.max
    config._effectiveTargetFloor = Math.max(10000, Math.round(config.max * 0.55))
    config._hardCeiling = true
  }

  try { writeDefaults() } catch {}

  return config
}

function writeDefaults() {
  fs.mkdirSync(GLOBAL_DIR, { recursive: true })
  if (!fs.existsSync(GLOBAL_PATH_JSONC)) {
    fs.writeFileSync(GLOBAL_PATH_JSONC, getDefaultJsoncContent(DEFAULTS) + "\n", "utf8")
  }
}

export { applyPreset, getDefaultJsoncContent, writeDefaults, PRESET_BEHAVIOR }
