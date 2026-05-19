import path from "node:path"
import fs from "node:fs"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const FRAGMENTS_DIR = path.resolve(__dirname, "fragments")

/**
 * Read all fragment file paths sorted by filename (numeric prefix order).
 */
function fragmentFiles(): string[] {
  if (!fs.existsSync(FRAGMENTS_DIR)) return []
  return fs.readdirSync(FRAGMENTS_DIR)
    .filter(f => f.endsWith(".md"))
    .sort((a, b) => a.localeCompare(b))
    .map(f => path.join(FRAGMENTS_DIR, f))
}

/**
 * List all available fragment names (without .md extension).
 */
export function listFragments(): string[] {
  return fragmentFiles().map(f => path.basename(f, ".md"))
}

/**
 * Read a single fragment by name (e.g. "01-identity").
 * Returns the trimmed content of the fragment file, with original line endings preserved.
 * Throws if the fragment does not exist.
 */
export function composeFragment(name: string): string {
  // Sanitize: strip directory separators and path traversal sequences
  const safeName = name.replace(/[/\\:]/g, "_").replace(/\.\./g, "")
  if (safeName !== name) {
    console.warn(
      `[composer] Path traversal detected in fragment name "${name}", sanitized to "${safeName}"`,
    )
  }
  const filePath = path.join(FRAGMENTS_DIR, `${safeName}.md`)
  if (!fs.existsSync(filePath)) {
    throw new Error(`Fragment "${safeName}" not found at ${filePath}`)
  }
  return fs.readFileSync(filePath, "utf8").trimEnd()
}

/**
 * Compose all fragments into a single prompt string.
 * Fragments are joined with CRLF double newlines (\r\n\r\n) to match the
 * original prompt's section separator format.
 *
 * If a phases filter is provided, only fragments whose name includes
 * any of the given phase strings are included.
 *
 * If dynamicFragments is provided, those fragment names override or
 * supplement the fragments on disk. Dynamic fragments are checked first
 * before falling back to reading from the fragments directory.
 *
 * @param options.phases - Optional list of phase strings to filter fragments by.
 *                         A fragment is included if its name includes any phase string.
 * @param options.dynamicFragments - Optional map of fragment name → content
 *                                   for fragments provided in-memory. These
 *                                   take priority over disk-based fragments.
 */
export function compose(options?: { phases?: string[]; dynamicFragments?: Record<string, string> }): string {
  const dyn = options?.dynamicFragments ?? {}
  const phases = options?.phases

  // Collect all fragment names (disk + dynamic)
  const names = new Set<string>()
  for (const f of fragmentFiles()) {
    names.add(path.basename(f, ".md"))
  }
  for (const key of Object.keys(dyn)) {
    names.add(key)
  }

  // Sort and optionally filter by phase.
  // When phases is explicitly provided (even empty), apply filtering.
  // An empty phases array means "no fragments match" → empty output.
  let sorted = [...names].sort()
  if (phases !== undefined) {
    sorted = phases.length > 0
      ? sorted.filter(name => phases.some(p => name.includes(p)))
      : []
  }

  return sorted
    .map(name => {
      // Dynamic fragments take priority
      if (dyn[name] !== undefined) return dyn[name]
      // Fall back to reading from disk
      const filePath = path.join(FRAGMENTS_DIR, `${name}.md`)
      return fs.readFileSync(filePath, "utf8").trimEnd()
    })
    .join("\r\n\r\n")
}
