const LEVELS = { debug: 0, info: 1, warn: 2, error: 3 }
const CURRENT_LEVEL = LEVELS[process.env.OPENCODE_LOG_LEVEL?.trim().toLowerCase()] ?? LEVELS.info

function ts() {
  const d = new Date()
  return `${d.getHours().toString().padStart(2,"0")}:${d.getMinutes().toString().padStart(2,"0")}:${d.getSeconds().toString().padStart(2,"0")}.${d.getMilliseconds().toString().padStart(3,"0")}`
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

export function createLogger(name) {
  const prefix = `[openhermes:${name}]`

  function emit(levelName, color, ...args) {
    if (!shouldLog(levelName)) return
    const line = `${ts()} ${prefix} [${levelName.toUpperCase()}] ${formatArgs(args)}`
    const colored = process.stderr.isTTY ? `\x1b[${color}m${line}\x1b[0m` : line
    process.stderr.write(colored + "\n")
  }

  return {
    debug: (...args) => emit("debug", 90, ...args),
    info: (...args) => emit("info", 37, ...args),
    warn: (...args) => emit("warn", 33, ...args),
    error: (...args) => emit("error", 31, ...args),
  }
}

export const rootLogger = createLogger("root")
