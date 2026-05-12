import path from "node:path"
import os from "node:os"
import fs from "node:fs"
import { fileURLToPath } from "node:url"
import { isTruthy } from "./hardening.mjs"

const HOME = process.env.USERPROFILE || os.homedir()
const DATA_ROOT = path.join(HOME, ".local", "share", "opencode", "openhermes")
const CACHE_ROOT = path.join(HOME, ".cache", "opencode", "openhermes")
const PKG_DIR = path.dirname(fileURLToPath(import.meta.url))

function resolveRoot(envVar, fallback) {
  if (!isTruthy(process.env.OPENCODE_ALLOW_PROJECT_HARNESS)) return fallback
  const cwd = process.cwd()
  const project = path.join(cwd, ".opencode", "openhermes")
  try { fs.accessSync(path.join(project, "memory")); return project } catch {}
  return fallback
}


export function getDataRoot() {
  return resolveRoot("OPENCODE_ALLOW_PROJECT_HARNESS", DATA_ROOT)
}

export function getCacheRoot() {
  return CACHE_ROOT
}

export function getMemoryRoot() {
  return path.join(getDataRoot(), "memory")
}

export function getRuntimeRoot() {
  return path.join(getDataRoot(), "runtime")
}

export function getRecallRoot() {
  return path.join(getCacheRoot(), "recall")
}

export function getArchiveRoot() {
  return path.join(getDataRoot(), "archive")
}

export function getSchemaRoot() {
  return path.resolve(PKG_DIR, "..", "schemas")
}

export function getMemoryDbPath() {
  return process.env.OPENHERMES_MEMORY_DB || path.join(getDataRoot(), "memory.db")
}


