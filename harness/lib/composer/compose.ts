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
  const filePath = path.join(FRAGMENTS_DIR, `${name}.md`)
  if (!fs.existsSync(filePath)) {
    throw new Error(`Fragment "${name}" not found at ${filePath}`)
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
 * @param options.phases - Optional list of phase strings to filter fragments by.
 *                         A fragment is included if its name includes any phase string.
 */
export function compose(options?: { phases?: string[] }): string {
  const files = options?.phases
    ? fragmentFiles().filter(f => options.phases!.some(p => path.basename(f).includes(p)))
    : fragmentFiles()

  return files
    .map(f => fs.readFileSync(f, "utf8").trimEnd())
    .join("\r\n\r\n")
}
