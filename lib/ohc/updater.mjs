import fs from "node:fs"
import path from "node:path"
import os from "node:os"

const CONFIG_PATH = path.join(os.homedir(), ".config", "opencode", "opencode.json")
const CACHE_ROOT = path.join(os.homedir(), ".cache", "opencode", "packages")

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

function findCacheDirs() {
  const results = []
  if (!fs.existsSync(CACHE_ROOT)) return results
  try {
    for (const e of fs.readdirSync(CACHE_ROOT)) {
      const full = path.join(CACHE_ROOT, e)
      if (e.startsWith("openhermes") && fs.statSync(full).isDirectory()) {
        results.push({ name: e, path: full })
      }
    }
  } catch {}
  return results
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
      text: `[Update-Me] No cached version found. Already at the latest (method: ${info.method}). Restart OpenCode if you suspect a stale install.`,
    })
    return
  }

  const deleted = []
  const failed = []
  for (const dir of cacheDirs) {
    try {
      fs.rmSync(dir.path, { recursive: true, force: true })
      deleted.push(dir.name)
    } catch (e) {
      failed.push({ name: dir.name, error: e.message })
    }
  }

  output.parts.length = 0
  let msg = `[Update-Me] OpenHermes update (${info.method})\n`

  if (deleted.length > 0) {
    msg += `\nCleared:\n`
    for (const d of deleted) msg += `  ✓ ${d}\n`
  }

  if (failed.length > 0) {
    msg += `\n⚠ Could not remove (file may be locked):\n`
    for (const f of failed) msg += `  ✗ ${f.name} — ${f.error}\n`
    msg += `Try deleting manually:\n  ${CACHE_ROOT}\n`
  }

  msg += `\nRestart OpenCode to load the latest OpenHermes from ${info.method === "git" ? "git HEAD" : "npm registry"}.`

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
