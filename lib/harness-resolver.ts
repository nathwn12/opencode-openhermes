// Shared harness directory resolver — canonical implementation.
// Extracted from bootstrap.ts. Both bootstrap.ts and tests import from here.

import path from "node:path"
import fs from "node:fs"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PKG_DIR = path.resolve(__dirname, "..")

const REQUIRED_HARNESS_FILES: ReadonlyArray<readonly string[]> = [
  ["codex", "CONSTITUTION.md"],
  ["instructions", "RUNTIME.md"],
  ["skills", "oh-plan", "SKILL.md"],
]

function ancestorDirs(start: string, limit = 6): string[] {
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

function buildHarnessCandidates(currentDir: string, execPath: string, cwd: string): string[] {
  const roots = [path.resolve(currentDir, "harness")]
  const seen = new Set(roots)

  const anchors = [path.dirname(execPath), path.dirname(path.dirname(execPath)), cwd]
  for (const anchor of anchors) {
    for (const dir of ancestorDirs(anchor)) {
      for (const root of [
        path.join(dir, "harness"),
        path.join(dir, "node_modules", "openhermes", "harness"),
        path.join(dir, "bin", "node_modules", "openhermes", "harness"),
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
  const roots = candidateRoots ?? buildHarnessCandidates(currentDir, execPath, cwd)
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
