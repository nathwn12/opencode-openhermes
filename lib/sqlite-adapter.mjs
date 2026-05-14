import { createRequire } from "node:module"
import { createLogger } from "./logger.mjs"

const log = createLogger("sqlite-adapter")

export function createBunDatabaseCtor(mod) {
  if (typeof mod?.Database !== "function") throw new Error("bun:sqlite Database constructor unavailable")
  return mod.Database
}

export function describeSqliteInterface(Ctor) {
  if (typeof Ctor !== "function") return false
  const proto = Ctor.prototype
  return typeof proto?.exec === "function" && typeof proto?.prepare === "function" && typeof proto?.close === "function"
}

const _require = createRequire(import.meta.url)

let _driver = null
let _driverInitAttempted = false
let _driverInitError = null

function initDriver() {
  if (_driver) return _driver
  if (_driverInitAttempted) {
    if (_driverInitError) throw _driverInitError
    return _driver
  }
  _driverInitAttempted = true

  try {
    const mod = _require("node:sqlite")
    _driver = mod.DatabaseSync
    log.info("using node:sqlite driver")
    return _driver
  } catch (e) {
    log.debug("node:sqlite not available:", e.message)
  }

  try {
    const mod = _require("better-sqlite3")
    _driver = mod
    log.info("using better-sqlite3 driver")
    return _driver
  } catch { /* better-sqlite3 not available */ }

  _driverInitError = new Error(
    "No SQLite driver available. OpenHermes requires Node.js 22+ (node:sqlite), Bun (bun:sqlite), or better-sqlite3."
  )
  log.error(_driverInitError.message)
  throw _driverInitError
}

export function getDriver() {
  return initDriver()
}
