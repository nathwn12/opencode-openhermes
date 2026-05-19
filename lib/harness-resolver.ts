// Shared harness directory resolver — canonical implementation.
// Extracted from bootstrap.ts. Both bootstrap.ts and tests import from here.

import path from "node:path"
import fs from "node:fs"
import os from "node:os"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PKG_DIR = path.resolve(__dirname, "..")

const REQUIRED_HARNESS_FILES: ReadonlyArray<readonly string[]> = [
  ["codex", "CHARTER.md"],
  ["codex", "AUTOPILOT.md"],
  ["skills", "oh-planner", "SKILL.md"],
]

function ancestorDirs(start: string, limit = 3): string[] {
  const dirs: string[] = []
  let current = path.resolve(start)
  for (let i = 0; i < limit; i++) {
    dirs.push(current)
    const parent = path.dirname(current)
    if (parent === current) break
    current = parent
  }
  return dirs
}

function buildHarnessCandidates(currentDir: string, cwd: string): string[] {
  const roots: string[] = []
  const seen = new Set<string>()

  for (const anchor of [currentDir, cwd]) {
    for (const dir of ancestorDirs(anchor)) {
      for (const root of [
        path.join(dir, "harness"),
        path.join(dir, "node_modules", "openhermes", "harness"),
      ]) {
        const normalized = path.normalize(root)
        if (seen.has(normalized)) continue
        seen.add(normalized)
        roots.push(normalized)
      }
    }
  }

  return roots
}

function hasRequiredHarnessFiles(root: string): boolean {
  return REQUIRED_HARNESS_FILES.every(parts => fs.existsSync(path.join(root, ...parts)))
}

/**
 * Resolve the OpenHermes package directory from OpenCode's plugin cache.
 * Scans ~/.cache/opencode/packages/ for any directory whose name contains
 * both "openhermes" and "nathwn12", then checks for
 * node_modules/openhermes/package.json inside.
 *
 * This makes resolution robust across distribution channels (regular vs #dev)
 * without depending on import.meta.url encoding behavior.
 *
 * Returns the resolved package directory path, or null if not found.
 */
export function resolveOpenCodePackageDir(): string | null {
  const cacheDir = path.join(os.homedir(), ".cache", "opencode", "packages")
  if (!fs.existsSync(cacheDir)) return null

  try {
    const entries = fs.readdirSync(cacheDir, { withFileTypes: true })
    for (const entry of entries) {
      if (!entry.isDirectory()) continue
      const name = entry.name
      if (name.includes("openhermes") && name.includes("nathwn12")) {
        const pkgDir = path.join(cacheDir, name, "node_modules", "openhermes")
        if (fs.existsSync(path.join(pkgDir, "package.json"))) {
          return path.resolve(pkgDir)
        }
      }
    }
  } catch {
    // Directory unreadable — not a fatal error
  }
  return null
}

export function resolveHarnessRoot({
  currentDir = PKG_DIR,
  execPath = process.execPath,
  cwd = process.cwd(),
  candidateRoots,
}: {
  currentDir?: string
  execPath?: string
  cwd?: string
  candidateRoots?: string[]
} = {}): string {
  // Check OpenCode plugin cache first — distribution-agnostic, handles #dev paths
  const cachePkgDir = resolveOpenCodePackageDir()
  if (cachePkgDir) {
    const cacheHarness = path.join(cachePkgDir, "harness")
    if (hasRequiredHarnessFiles(cacheHarness)) {
      return cacheHarness
    }
  }

  const roots = candidateRoots ?? buildHarnessCandidates(currentDir, cwd)
  for (const root of roots) {
    if (hasRequiredHarnessFiles(root)) return root
  }
  return path.resolve(currentDir, "harness")
}

let _harnessDir: string | undefined

export function setHarnessRootForTest(dir: string | undefined): void { _harnessDir = dir }

export function getHarnessDir(): string {
  if (!_harnessDir) _harnessDir = resolveHarnessRoot()
  return _harnessDir
}
