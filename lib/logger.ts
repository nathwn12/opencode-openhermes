import path from "node:path"
import os from "node:os"
import fs from "node:fs"

export interface Logger {
  debug: (...args: unknown[]) => void
  info: (...args: unknown[]) => void
  warn: (...args: unknown[]) => void
  error: (...args: unknown[]) => void
}

const LEVELS: Record<string, number> = { debug: 0, info: 1, warn: 2, error: 3 }

function resolveLevel(levelName: string | undefined): number | undefined {
  if (!levelName) return undefined
  return LEVELS[levelName as keyof typeof LEVELS]
}

const CURRENT_LEVEL = resolveLevel(process.env.OPENCODE_LOG_LEVEL?.trim().toLowerCase()) ?? (process.env.OPENHERMES_LOG_LEVEL?.trim().toLowerCase() === "debug" ? LEVELS.debug : LEVELS.warn)

const LOG_DIR = path.join(os.homedir(), ".local", "share", "opencode", "log")
const LOG_FILE = path.join(LOG_DIR, "openhermes.log")

function ts(): string {
  const d = new Date()
  return `${d.getFullYear()}-${(d.getMonth()+1).toString().padStart(2,"0")}-${d.getDate().toString().padStart(2,"0")} ${d.getHours().toString().padStart(2,"0")}:${d.getMinutes().toString().padStart(2,"0")}:${d.getSeconds().toString().padStart(2,"0")}.${d.getMilliseconds().toString().padStart(3,"0")}`
}

function formatArgs(args: unknown[]): string {
  return args.map(a => {
    if (a === null) return "null"
    if (a === undefined) return "undefined"
    if (typeof a === "object") {
      try { return (a as Error)?.message || JSON.stringify(a) } catch { return String(a) }
    }
    return String(a)
  }).join(" ")
}

function shouldLog(levelName: string): boolean {
  return LEVELS[levelName] >= CURRENT_LEVEL
}

let _fd: number | null = null
function getFd(): number {
  if (_fd) return _fd
  try {
    fs.mkdirSync(LOG_DIR, { recursive: true })
    _fd = fs.openSync(LOG_FILE, "a")
  } catch {
    _fd = -1
  }
  return _fd
}

export function createLogger(name: string): Logger {
  const prefix = `[openhermes:${name}]`

  function emit(levelName: string, ...args: unknown[]): void {
    if (!shouldLog(levelName)) return
    const fd = getFd()
    if (fd < 0) return
    const line = `${ts()} ${prefix} [${levelName.toUpperCase()}] ${formatArgs(args)}\n`
    try { fs.writeSync(fd, line) } catch {}
  }

  return {
    debug: (...args: unknown[]) => emit("debug", ...args),
    info: (...args: unknown[]) => emit("info", ...args),
    warn: (...args: unknown[]) => emit("warn", ...args),
    error: (...args: unknown[]) => emit("error", ...args),
  }
}

export const rootLogger: Logger = createLogger("root")
