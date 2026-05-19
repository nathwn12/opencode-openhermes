import fs from "node:fs"
import path from "node:path"
import { parseSkillFrontmatter } from "./skill-frontmatter-parser.ts"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SkillIndexEntry {
  route: {
    pass: string | string[]
    fail: string | string[]
    blocker: string | string[]
  }
}

// Key is skill name (kebab-case), value is the entry
export type SkillsIndex = Record<string, SkillIndexEntry>

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Build a condensed skills index from one or more skills directories.
 *
 * @param skillsDirs - Ordered array of skill directory paths.
 *   Later directories override earlier ones on name conflict.
 *   First path is expected to be the built-in OH harness skills dir.
 *
 * Returns a record keyed by skill name (kebab-case) with compact entries.
 */
export function buildSkillsIndex(skillsDirs: string[]): SkillsIndex {
  const index: SkillsIndex = {}

  for (const skillsDir of skillsDirs) {
    if (!fs.existsSync(skillsDir)) continue

    const entries = fs.readdirSync(skillsDir, { withFileTypes: true })
    for (const entry of entries) {
      if (!entry.isDirectory()) continue

      const skillPath = path.join(skillsDir, entry.name)
      const skillFile = path.join(skillPath, "SKILL.md")
      if (!fs.existsSync(skillFile)) continue

      const source = fs.readFileSync(skillFile, "utf8")
      const meta = parseSkillFrontmatter(source)
      if (!meta || !meta.name) continue

      // Convert SkillRouteMap (always arrays) to SkillIndexEntry format
      // (undefined when empty, string when single element, array when multiple)
      const route = (() => {
        const { pass, fail, blocker } = meta.route
        if (pass.length === 0 && fail.length === 0 && blocker.length === 0) {
          return undefined
        }
        return {
          pass: pass.length === 1 ? pass[0] : pass,
          fail: fail.length === 1 ? fail[0] : fail,
          blocker: blocker.length === 1 ? blocker[0] : blocker,
        }
      })()

      if (route) {
        index[meta.name] = { route }
      }
    }
  }

  return index
}

/**
 * Serialize the index as a compact JSON string with abbreviated keys.
 *
 * Format per entry: { "r": [pass, fail, blocker] }
 * Route is serialized as a 3-element array to save space.
 */
export function serializeCompactJson(index: SkillsIndex): string {
  const entries = Object.entries(index).map(([name, entry]) => {
    const r = entry.route
    const route = `[${JSON.stringify(r.pass)},${JSON.stringify(r.fail)},${JSON.stringify(r.blocker)}]`
    return `  ${JSON.stringify(name)}:{"r":${route}}`
  })
  return "{\n" + entries.join(",\n") + "\n}"
}

/**
 * Render the skills index as a Markdown fragment with an embedded JSON block.
 * Uses compact route-only format: { "r": [pass, fail, blocker] } per entry.
 */
export function formatSkillsIndexFragment(index: SkillsIndex): string {
  const json = serializeCompactJson(index)

  return [
    "## Skills Index",
    "",
    "Compact skill routing table. Maps each skill to its route targets",
    "(3-element array: [pass, fail, blocker]).",
    "Key: r=route [pass, fail, blocker].",
    "",
    "```json",
    json,
    "```",
    "",
  ].join("\n")
}
