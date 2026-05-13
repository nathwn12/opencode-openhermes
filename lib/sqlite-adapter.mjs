import { createRequire } from "node:module"

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
try {
  const mod = _require("node:sqlite")
  _driver = mod.DatabaseSync
} catch { /* node:sqlite unavailable, try bun below */ }

if (!_driver) {
  try {
    const mod = await import("bun:sqlite")
    _driver = createBunDatabaseCtor(mod)
  } catch {
    throw new Error(
      "No SQLite driver available. OpenHermes requires Node.js 22+ (node:sqlite) or Bun (bun:sqlite)."
    )
  }
}

export const SQLITE_DRIVER = _driver
