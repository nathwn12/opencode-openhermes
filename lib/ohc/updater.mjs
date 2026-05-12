import fs from "node:fs"
import path from "node:path"
import os from "node:os"

const CONFIG_PATH = path.join(os.homedir(), ".config", "opencode", "opencode.json")
const CACHE_ROOTS = [
  path.join(os.homedir(), ".cache", "opencode", "packages"),
  path.join(os.homedir(), ".cache", "opencode", "node_modules"),
]
const FALLBACK_SOURCE = "openhermes@git+https://github.com/nathwn12/openhermes.git"

function detectInstallMethod({ configPath = CONFIG_PATH } = {}) {
  let raw = {}
  try {
    raw = JSON.parse(fs.readFileSync(configPath, "utf8"))
  } catch {
    return { method: "unknown", entry: null, reason: `cannot read ${configPath}` }
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

function ensureOutputParts(output) {
  if (!output || typeof output !== "object") return { parts: [] }
  if (!Array.isArray(output.parts)) output.parts = []
  return output
}

function writeUpdateMeMessage(output, text) {
  const target = ensureOutputParts(output)
  target.parts.length = 0
  target.parts.push({ type: "text", text })
}

function buildUpdateMeMessage({ info, clearedCount = 0, failedCount = 0, firstError = null, source = FALLBACK_SOURCE }) {
  const lines = ["[Update-Me] OpenHermes refresh"]

  if (info?.reason && info.method === "unknown") {
    lines.push(`- Cache source unreadable: ${info.reason}`)
  }

  if (clearedCount > 0) {
    lines.push(`- Cleared OpenHermes cache (${clearedCount} entr${clearedCount === 1 ? "y" : "ies"}).`)
  } else {
    lines.push("- No OpenHermes cache found to clear.")
  }

  if (failedCount > 0) {
    lines.push(`- ${failedCount} entr${failedCount === 1 ? "y" : "ies"} could not be removed.`)
    if (firstError) lines.push(`- ${firstError}`)
  }

  lines.push(`- Restart OpenCode. If OpenHermes is missing or corrupted, it should redownload ${source} on launch.`)
  return lines.join("\n")
}

export async function runUpdateMe({ output, configPath = CONFIG_PATH, cacheRoots = CACHE_ROOTS, rmSync = fs.rmSync } = {}) {
  const info = detectInstallMethod({ configPath })
  const cacheDirs = findCacheDirs({ cacheRoots })

  let clearedCount = 0
  let failedCount = 0
  let firstError = null

  for (const dir of cacheDirs) {
    try {
      rmSync(dir.path, { recursive: true, force: true })
      clearedCount++
    } catch (e) {
      failedCount++
      if (!firstError) firstError = e?.message ?? String(e)
    }
  }

  writeUpdateMeMessage(output, buildUpdateMeMessage({ info, clearedCount, failedCount, firstError }))

  return { info, cacheDirs, clearedCount, failedCount, firstError }
}

async function handleUpdateMe(ctx, input, output) {
  try {
    await runUpdateMe({ output })
  } catch (e) {
    writeUpdateMeMessage(output, buildUpdateMeMessage({
      info: { method: "unknown", reason: e?.message ?? String(e) },
      source: FALLBACK_SOURCE,
    }))
  }
}

export function UpdaterPlugin(ctx) {
  return {
    "command.execute.before": async (input, output) => {
      if (input.command !== "update-me") return
      await handleUpdateMe(ctx, input, output)
    },
  }
}
