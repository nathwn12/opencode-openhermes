import fs from "node:fs"
import path from "node:path"
import os from "node:os"

const STATE_DIR = path.join(os.homedir(), ".local", "share", "opencode")
const STATE_FILE = path.join(STATE_DIR, "ohc-state.json")

function readAll() {
  try {
    return JSON.parse(fs.readFileSync(STATE_FILE, "utf8"))
  } catch {
    return {}
  }
}

function writeAll(data) {
  fs.mkdirSync(STATE_DIR, { recursive: true })
  fs.writeFileSync(STATE_FILE, JSON.stringify(data, null, 2), "utf8")
}

export function loadOhcState(sessionId) {
  if (!sessionId) return null
  const all = readAll()
  return all[sessionId] || null
}

export function saveOhcState(sessionId, data) {
  if (!sessionId) return
  const all = readAll()
  all[sessionId] = { ...data, updatedAt: new Date().toISOString() }
  writeAll(all)
}
