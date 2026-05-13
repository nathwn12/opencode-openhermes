// Shared harness directory resolver — canonical implementation.
// Extracted from bootstrap.mjs to eliminate DRY violation with goal-tracker.mjs.
// Both consumers import from here.

import path from "node:path"
import fs from "node:fs"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PKG_DIR = path.resolve(__dirname, "..")

const REQUIRED_HARNESS_FILES = [
  ["codex", "CONSTITUTION.md"],
  ["instructions", "RUNTIME.md"],
  ["skills", "oh-plan", "SKILL.md"],
]

function ancestorDirs(start, limit = 6) {
  const dirs = []
  let current = path.resolve(start)
  for (let i = 0; i < limit; i++) {
    dirs.push(current)
    const parent = path.dirname(current)
    if (parent === current) break
    current = parent
  }
  return dirs
}

function buildHarnessCandidates(currentDir, execPath, cwd) {
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

function hasRequiredHarnessFiles(root) {
  return REQUIRED_HARNESS_FILES.every(parts => fs.existsSync(path.join(root, ...parts)))
}

export function resolveHarnessRoot({
  currentDir = PKG_DIR,
  execPath = process.execPath,
  cwd = process.cwd(),
  candidateRoots,
} = {}) {
  const roots = candidateRoots ?? buildHarnessCandidates(currentDir, execPath, cwd)
  for (const root of roots) {
    if (hasRequiredHarnessFiles(root)) return root
  }
  return path.resolve(currentDir, "harness")
}

let _harnessDir

export function setHarnessRootForTest(dir) { _harnessDir = dir }

export function getHarnessDir() {
  if (!_harnessDir) _harnessDir = resolveHarnessRoot()
  return _harnessDir
}
