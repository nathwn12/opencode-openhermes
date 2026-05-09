import { existsSync, readFileSync, writeFileSync, rmSync } from "node:fs"
import { join, dirname } from "node:path"
import { fileURLToPath } from "node:url"

const CURRENT_DIR = typeof __dirname !== "undefined"
  ? __dirname
  : dirname(fileURLToPath(import.meta.url))

const PACKAGE_JSON_PATH = join(CURRENT_DIR, "..", "..", "package.json")

function findPackageRoot(startDir: string): string | null {
  let cur = startDir
  while (cur.length > 3) {
    if (existsSync(join(cur, "package.json"))) return cur
    const parent = dirname(cur)
    if (parent === cur) break
    cur = parent
  }
  return null
}

function readPackageVersion(dir?: string): string | null {
  const pkgPath = dir ? join(dir, "package.json") : PACKAGE_JSON_PATH
  try {
    if (!existsSync(pkgPath)) return null
    const pkg = JSON.parse(readFileSync(pkgPath, "utf8"))
    return pkg.version || null
  } catch {
    return null
  }
}

export function isAutoUpdatableSpec(spec: string): boolean {
  if (!spec || spec === "*") return true
  if (spec.startsWith("^") || spec.startsWith("~")) return true
  if (/^\d+\.\d+\.\d+$/.test(spec)) return false
  return true
}

export function isVersionNewer(latest: string, current: string): boolean {
  const lParts = latest.split(".").map(Number)
  const cParts = current.split(".").map(Number)
  for (let i = 0; i < Math.max(lParts.length, cParts.length); i++) {
    const l = lParts[i] || 0
    const c = cParts[i] || 0
    if (l > c) return true
    if (l < c) return false
  }
  return false
}

export async function checkAutoUpdate(signal?: AbortSignal): Promise<string | null> {
  const pkgRoot = findPackageRoot(CURRENT_DIR)
  if (!pkgRoot) return null

  const currentVersion = readPackageVersion(pkgRoot)
  if (!currentVersion) return null

  const pkgJson = JSON.parse(readFileSync(join(pkgRoot, "package.json"), "utf8"))
  const packageName = pkgJson.name || "@tarquinen/opencode-dcp"

  try {
    const response = await fetch(`https://registry.npmjs.org/${encodeURIComponent(packageName)}/latest`, {
      signal,
      headers: { Accept: "application/json" },
    })
    if (!response.ok) return null
    const data = await response.json() as { version?: string }
    const latestVersion = data.version
    if (!latestVersion) return null

    const depSpec = pkgJson.dependencies?.[packageName] || pkgJson.peerDependencies?.[packageName] || "^0.0.0"
    if (!isAutoUpdatableSpec(depSpec)) return null

    if (isVersionNewer(latestVersion, currentVersion)) {
      return latestVersion
    }
    return null
  } catch {
    return null
  }
}

export async function startAutoUpdate(client: unknown, enabled: boolean): Promise<void> {
  if (!enabled) {
    try {
      await (client as any)?.tui?.showToast?.({ body: { title: "OHC Auto-Update", message: "Auto-update disabled in config", variant: "info", duration: 4000 } })
    } catch {}
    return
  }

  try {
    const ac = new AbortController()
    const timeout = setTimeout(() => ac.abort(), 10000)

    const latestVersion = await checkAutoUpdate(ac.signal)
    clearTimeout(timeout)

    if (!latestVersion) {
      try {
        await (client as any)?.tui?.showToast?.({ body: { title: "OHC Auto-Update", message: "Already up to date or check failed", variant: "info", duration: 4000 } })
      } catch {}
      return
    }

    const pkgRoot = findPackageRoot(CURRENT_DIR)
    if (!pkgRoot) return
    const currentVersion = readPackageVersion(pkgRoot)

    try {
      await (client as any)?.tui?.showToast?.({
        body: { title: "OHC Update Available", message: `v${currentVersion} → v${latestVersion}. Restart OpenCode to apply.`, variant: "info", duration: 8000 },
      })
    } catch {}

    const pkgJsonPath = join(pkgRoot, "package.json")
    const pkgJson = JSON.parse(readFileSync(pkgJsonPath, "utf8"))
    pkgJson.version = latestVersion
    writeFileSync(pkgJsonPath, JSON.stringify(pkgJson, null, 2) + "\n", "utf8")
  } catch {}
}
