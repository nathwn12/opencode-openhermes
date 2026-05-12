import fs from "node:fs"
import path from "node:path"
import os from "node:os"

const CONFIG_PATH = path.join(os.homedir(), ".config", "opencode", "opencode.json")
const CACHE_ROOTS = [
  path.join(os.homedir(), ".cache", "opencode", "packages"),
  path.join(os.homedir(), ".cache", "opencode", "node_modules"),
]

function detectInstallMethod() {
  let raw = {}
  try {
    raw = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"))
  } catch {
    return { method: "unknown", entry: null, reason: `cannot read ${CONFIG_PATH}` }
  }

  const plugins = Array.isArray(raw.plugin) ? raw.plugin : []
  for (const p of plugins) {
    const entry = typeof p === "string" ? p : (Array.isArray(p) && typeof p[0] === "string" ? p[0] : "")
    if (!entry.startsWith("openhermes")) continue

    if (entry.includes("@git+https://") || entry.includes("@git+ssh://")) {
      const repoUrl = entry.replace(/^openhermes@/, "")
      return { method: "git", entry, repoUrl }
    }

    if (entry === "openhermes") {
      return { method: "npm", entry }
    }

    return { method: "other", entry, reason: `unrecognized format: ${entry}` }
  }

  return { method: "unknown", entry: null, reason: "openhermes not found in plugin config" }
}

function walkCacheDirs(root, results) {
  if (!fs.existsSync(root)) return
  if (path.basename(root).startsWith("openhermes")) {
    results.push({ name: path.basename(root), path: root })
  }
  let entries = []
  try {
    entries = fs.readdirSync(root, { withFileTypes: true })
  } catch {
    return
  }

  for (const entry of entries) {
    if (!entry.isDirectory()) continue
    const full = path.join(root, entry.name)
    if (entry.name.startsWith("openhermes")) {
      results.push({ name: entry.name, path: full })
    }
    walkCacheDirs(full, results)
  }
}

export function findCacheDirs({ cacheRoots = CACHE_ROOTS } = {}) {
  const results = []
  for (const root of cacheRoots) walkCacheDirs(root, results)
  const seen = new Set()
  return results.filter(dir => {
    if (seen.has(dir.path)) return false
    seen.add(dir.path)
    return true
  })
}

async function handleUpdateMe(ctx, input, output) {
  const info = detectInstallMethod()

  if (info.method === "unknown") {
    output.parts.length = 0
    output.parts.push({
      type: "text",
      text: `[Update-Me] Could not detect installation method.\n${info.reason}\n\nEnsure 'openhermes' is in your opencode.json plugin list:\n  https://github.com/nathwn12/openhermes#setup`,
    })
    return
  }

  const cacheDirs = findCacheDirs()

  if (cacheDirs.length === 0) {
    output.parts.length = 0
    output.parts.push({
      type: "text",
      text: `[Update-Me] No OpenHermes plugin cache found.\nRestart OpenCode to redownload from ${info.method === "git" ? "git HEAD" : "npm registry"}.`,
    })
    return
  }

  let clearedCount = 0
  let failedCount = 0
  let firstError = null
  for (const dir of cacheDirs) {
    try {
      fs.rmSync(dir.path, { recursive: true, force: true })
      clearedCount++
    } catch (e) {
      failedCount++
      if (!firstError) firstError = e.message
    }
  }

  output.parts.length = 0
  let msg = `[Update-Me] OpenHermes update (${info.method})\n`

  if (clearedCount > 0) {
    msg += `\n  ✓ Cleared OpenHermes plugin cache (${clearedCount} entr${clearedCount === 1 ? "y" : "ies"}).`
  }

  if (failedCount > 0) {
    msg += `\n  ⚠ ${failedCount} entr${failedCount === 1 ? "y" : "ies"} could not be removed (may be locked).`
    if (firstError) msg += `\n  ${firstError}`
  }

  msg += `\n\nRestart OpenCode to load the latest OpenHermes from ${info.method === "git" ? "git HEAD" : "npm registry"}.`

  output.parts.push({ type: "text", text: msg })
}

export function UpdaterPlugin(ctx) {
  return {
    "command.execute.before": async (input, output) => {
      if (input.command !== "update-me") return
      await handleUpdateMe(ctx, input, output)
    },
  }
}
