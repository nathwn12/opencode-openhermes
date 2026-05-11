import fs from "node:fs"
import path from "node:path"
import os from "node:os"

const CONFIG_PATH = path.join(os.homedir(), ".config", "opencode", "ohc.json")

const DEFAULTS = { enabled: true, max: 200000, min: 50000 }

function writeDefaults() {
  try {
    fs.mkdirSync(path.dirname(CONFIG_PATH), { recursive: true })
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(DEFAULTS, null, 2) + "\n", "utf8")
  } catch {}
}

export function loadConfig() {
  let raw = {}
  try {
    raw = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"))
  } catch {
    writeDefaults()
    return { ...DEFAULTS }
  }

  return {
    enabled: raw.enabled !== false,
    max: typeof raw.max === "number" && raw.max > 0 ? raw.max : DEFAULTS.max,
    min: typeof raw.min === "number" ? Math.max(10000, raw.min) : DEFAULTS.min,
  }
}