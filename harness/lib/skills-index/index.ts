import fs from "node:fs"
import path from "node:path"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SkillIndexEntry {
  description: string
  tier: "core" | "dynamic" | "niche"
  route?: {
    pass: string | string[]
    fail: string | string[]
    blocker: string | string[]
  }
}

// Key is skill name (kebab-case), value is the entry
export type SkillsIndex = Record<string, SkillIndexEntry>

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

interface RawSkillMeta {
  name: string
  description: string
  route?: {
    pass: string | string[]
    fail: string | string[]
    blocker: string | string[]
  }
}

/**
 * Parse a SKILL.md file frontmatter to extract name, description, and route info.
 * Returns null if the file has no frontmatter or no name field.
 *
 * Handles three route formats:
 *   pass: oh-grill                    (single string)
 *   pass: [oh-skill-craft, oh-skills-link]  (inline array)
 *   pass:\n  - oh-gauntlet\n  - oh-ship  (list items)
 */
function parseSkillFile(filePath: string): RawSkillMeta | null {
  const source = fs.readFileSync(filePath, "utf8")
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---/)
  if (!match) return null

  const lines = match[1].split(/\r?\n/)
  let name = ""
  let description = ""
  const pass: string[] = []
  const fail: string[] = []
  const blocker: string[] = []

  let currentRouteKey: "pass" | "fail" | "blocker" | null = null

  for (const raw of lines) {
    const line = raw.trimEnd()

    // List item under route block (e.g. "  - oh-gauntlet")
    const listMatch = line.match(/^\s+-\s+(.+)$/)
    if (listMatch && currentRouteKey) {
      const val = listMatch[1].trim().replace(/^["']|["']$/g, "")
      if (val) {
        if (currentRouteKey === "pass") pass.push(val)
        else if (currentRouteKey === "fail") fail.push(val)
        else if (currentRouteKey === "blocker") blocker.push(val)
      }
      continue
    }

    // Indented route sub-keys — handle inline value or list starter
    const pMatch = line.match(/^\s+pass:\s*(.*)$/)
    const fMatch = line.match(/^\s+fail:\s*(.*)$/)
    const bMatch = line.match(/^\s+blocker:\s*(.*)$/)

    if (pMatch) {
      currentRouteKey = null
      const val = pMatch[1].trim()
      if (val.startsWith("[")) {
        // Inline array: [oh-skill-craft, oh-skills-link]
        pass.push(...val.replace(/^\[|\]$/g, "").split(",").map(s => s.trim().replace(/^["']|["']$/g, "")).filter(Boolean))
      } else if (val && !val.startsWith("-")) {
        // Single string value
        pass.push(val.replace(/^["']|["']$/g, ""))
      } else {
        // List follows on following lines (value was empty or "-")
        currentRouteKey = "pass"
      }
      continue
    }

    if (fMatch) {
      currentRouteKey = null
      const val = fMatch[1].trim()
      if (val.startsWith("[")) {
        fail.push(...val.replace(/^\[|\]$/g, "").split(",").map(s => s.trim().replace(/^["']|["']$/g, "")).filter(Boolean))
      } else if (val && !val.startsWith("-")) {
        fail.push(val.replace(/^["']|["']$/g, ""))
      } else {
        currentRouteKey = "fail"
      }
      continue
    }

    if (bMatch) {
      currentRouteKey = null
      const val = bMatch[1].trim()
      if (val.startsWith("[")) {
        blocker.push(...val.replace(/^\[|\]$/g, "").split(",").map(s => s.trim().replace(/^["']|["']$/g, "")).filter(Boolean))
      } else if (val && !val.startsWith("-")) {
        blocker.push(val.replace(/^["']|["']$/g, ""))
      } else {
        currentRouteKey = "blocker"
      }
      continue
    }

    // Top-level fields
    const nMatch = line.match(/^name:\s*(.+)$/)
    if (nMatch) { name = nMatch[1].trim().replace(/^["']|["']$/g, ""); continue }
    const dMatch = line.match(/^description:\s*(.+)$/)
    if (dMatch) { description = dMatch[1].trim().replace(/^["']|["']$/g, ""); continue }

    // Non-indented non-empty line → exit route block context
    if (line.length > 0 && !line.startsWith(" ")) {
      currentRouteKey = null
    }
  }

  if (!name) return null

  const hasRoute = pass.length > 0 || fail.length > 0 || blocker.length > 0
  const route = hasRoute
    ? {
        pass: pass.length === 1 ? pass[0] : pass,
        fail: fail.length === 1 ? fail[0] : fail,
        blocker: blocker.length === 1 ? blocker[0] : blocker,
      }
    : undefined

  return { name, description, route }
}

/**
 * Truncate a string to a maximum length, appending "..." if truncated.
 */
function truncate(s: string, maxLen: number): string {
  if (s.length <= maxLen) return s
  return s.slice(0, maxLen) + "..."
}

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

      const meta = parseSkillFile(skillFile)
      if (!meta || !meta.name) continue

      // Tier assignment:
      // - Path contains "openhermes/harness/skills" → core (OH-native)
      //   OR first path in array (built-in OH harness)
      // - Description mentions known external packages → dynamic
      // - Everything else → niche
      const normalizedPath = skillPath.replace(/\\/g, "/")
      const isCore = normalizedPath.includes("openhermes/harness/skills")
        || (skillsDirs.length > 0 && skillPath.startsWith(skillsDirs[0]!))
      const descLower = (meta.description || "").toLowerCase()

      const tier: "core" | "dynamic" | "niche" = isCore
        ? "core"
        : descLower.includes("gstack") || descLower.includes("superpowers")
          ? "dynamic"
          : "niche"

      index[meta.name] = {
        description: meta.description,
        tier,
        ...(meta.route ? { route: meta.route } : {}),
      }
    }
  }

  return index
}

/**
 * Maximum description length in the compact JSON output.
 * Descriptions longer than this are truncated with "..." suffix.
 * This keeps the index under ~5KB for 33+ OH skills.
 */
const MAX_DESC_LENGTH = 70

/**
 * Serialize the index as a compact JSON string with abbreviated keys.
 *
 * Key mapping:
 *   d = description   t = tier   r = route [pass, fail, blocker]
 *
 * Route is serialized as a 3-element array `[pass, fail, blocker]`
 * instead of a nested object, which saves ~7 bytes per skill entry.
 *
 * Descriptions exceeding MAX_DESC_LENGTH are truncated with "...".
 */
export function serializeCompactJson(index: SkillsIndex): string {
  const entries = Object.entries(index).map(([name, entry]) => {
    const desc = truncate(entry.description, MAX_DESC_LENGTH)
    const d = JSON.stringify(desc)
    const t = JSON.stringify(entry.tier)
    if (entry.route) {
      const r = entry.route
      const route = `[${JSON.stringify(r.pass)},${JSON.stringify(r.fail)},${JSON.stringify(r.blocker)}]`
      return `  ${JSON.stringify(name)}:{"d":${d},"t":${t},"r":${route}}`
    }
    return `  ${JSON.stringify(name)}:{"d":${d},"t":${t}}`
  })
  return "{\n" + entries.join(",\n") + "\n}"
}

/**
 * Render the skills index as a Markdown fragment with an embedded JSON block.
 * Uses compact single-letter keys (d/t/r) and route-as-array format to keep
 * the index under ~5KB for all 33+ OH skills.
 */
export function formatSkillsIndexFragment(index: SkillsIndex): string {
  const json = serializeCompactJson(index)

  return [
    "## Skills Index",
    "",
    "Compact skill routing table. Use this for classification and routing decisions.",
    "Tiers: core (OH-native), dynamic (frequently installed), niche (all others).",
    "Keys: d=description, t=tier, r=[pass, fail, blocker].",
    "",
    "```json",
    json,
    "```",
    "",
  ].join("\n")
}
