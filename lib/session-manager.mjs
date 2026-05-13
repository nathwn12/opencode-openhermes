import { mkdirSync, writeFileSync, readFileSync, existsSync, readdirSync, unlinkSync, statSync } from "node:fs"
import { join } from "node:path"
import { homedir } from "node:os"

function getSessionDir() {
  const base = process.env.XDG_CONFIG_HOME || join(homedir(), ".config", "opencode")
  const dir = join(base, "sessions")
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  return dir
}

let _idCounter = 0
function generateId() {
  _idCounter++
  return `session_${Date.now().toString(36)}_${_idCounter.toString(36)}`
}

export function saveSession(state) {
  const dir = getSessionDir()
  const id = state.id || generateId()
  const record = {
    id,
    summary: state.summary || "",
    timestamp: state.timestamp || new Date().toISOString(),
    status: state.status || "active",
    gitBranch: state.gitBranch || "",
    gitHash: state.gitHash || "",
    decisions: Array.isArray(state.decisions) ? state.decisions : [],
    context: state.context || "",
    activeFiles: Array.isArray(state.activeFiles) ? state.activeFiles : [],
  }
  const fp = join(dir, `${id}.json`)
  writeFileSync(fp, JSON.stringify(record, null, 2), "utf8")
  return id
}

export function resumeSession(id) {
  const dir = getSessionDir()
  const fp = join(dir, `${id}.json`)
  if (!existsSync(fp)) return null
  try {
    const raw = readFileSync(fp, "utf8")
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export function listSessions(limit = 10) {
  const dir = getSessionDir()
  if (!existsSync(dir)) return []
  const entries = readdirSync(dir).filter(f => f.endsWith(".json"))
  const sessions = entries.map(f => {
    const fp = join(dir, f)
    try {
      const raw = readFileSync(fp, "utf8")
      const data = JSON.parse(raw)
      return {
        id: data.id || f.replace(/\.json$/, ""),
        summary: data.summary || "",
        timestamp: data.timestamp || "",
        status: data.status || "unknown",
      }
    } catch {
      return null
    }
  }).filter(Boolean)
  sessions.sort((a, b) => {
    if (a.timestamp > b.timestamp) return -1
    if (a.timestamp < b.timestamp) return 1
    return 0
  })
  return sessions.slice(0, limit)
}

export function pruneSessions(days) {
  const dir = getSessionDir()
  if (!existsSync(dir)) return 0
  const cutoff = Date.now() - days * 86400000
  let count = 0
  const entries = readdirSync(dir).filter(f => f.endsWith(".json"))
  for (const f of entries) {
    const fp = join(dir, f)
    try {
      const st = statSync(fp)
      if (st.mtimeMs < cutoff) {
        unlinkSync(fp)
        count++
      }
    } catch {
      // skip unreadable files
    }
  }
  return count
}
