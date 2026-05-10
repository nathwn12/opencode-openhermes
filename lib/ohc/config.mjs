import fs from "node:fs"
import path from "node:path"
import os from "node:os"

const CONFIG_PATH = path.join(os.homedir(), ".config", "opencode", "openhermes", "ohc.json")

const DEFAULTS = { enabled: true, max: null, min: 50000 }

export function loadConfig() {
  let raw = {}
  try { raw = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8")) } catch {}
  return {
    enabled: raw.enabled !== false,
    max: typeof raw.max === "number" && raw.max > 0 ? raw.max : null,
    min: typeof raw.min === "number" ? Math.max(10000, raw.min) : DEFAULTS.min,
  }
}
