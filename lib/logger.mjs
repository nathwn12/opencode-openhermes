import path from "node:path"
import os from "node:os"
import fs from "node:fs"

const LEVELS = { debug: 0, info: 1, warn: 2, error: 3 }
const CURRENT_LEVEL = LEVELS[process.env.OPENCODE_LOG_LEVEL?.trim().toLowerCase()] ?? (process.env.OPENHERMES_LOG_LEVEL?.trim().toLowerCase() === "debug" ? LEVELS.debug : LEVELS.warn)

const LOG_DIR = path.join(os.homedir(), ".local", "share", "opencode", "log")
const LOG_FILE = path.join(LOG_DIR, "openhermes.log")

function ts() {
  const d = new Date()
  return `${d.getFullYear()}-${(d.getMonth()+1).toString().padStart(2,"0")}-${d.getDate().toString().padStart(2,"0")} ${d.getHours().toString().padStart(2,"0")}:${d.getMinutes().toString().padStart(2,"0")}:${d.getSeconds().toString().padStart(2,"0")}.${d.getMilliseconds().toString().padStart(3,"0")}`
}

function formatArgs(args) {
  return args.map(a => {
    if (a === null) return "null"
    if (a === undefined) return "undefined"
    if (typeof a === "object") {
      try { return a?.message || JSON.stringify(a) } catch { return String(a) }
    }
    return String(a)
  }).join(" ")
}

function shouldLog(levelName) {
  return LEVELS[levelName] >= CURRENT_LEVEL
}

let _fd = null
function getFd() {
  if (_fd) return _fd
  try {
    fs.mkdirSync(LOG_DIR, { recursive: true })
    _fd = fs.openSync(LOG_FILE, "a")
  } catch {
    _fd = -1
  }
  return _fd
}

export function createLogger(name) {
  const prefix = `[openhermes:${name}]`

  function emit(levelName, ...args) {
    if (!shouldLog(levelName)) return
    const fd = getFd()
    if (fd < 0) return
    const line = `${ts()} ${prefix} [${levelName.toUpperCase()}] ${formatArgs(args)}\n`
    try { fs.writeSync(fd, line) } catch {}
  }

  return {
    debug: (...args) => emit("debug", ...args),
    info: (...args) => emit("info", ...args),
    warn: (...args) => emit("warn", ...args),
    error: (...args) => emit("error", ...args),
  }
}

export const rootLogger = createLogger("root")
