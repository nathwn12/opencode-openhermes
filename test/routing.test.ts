import { describe, it } from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SKILLS_DIR = path.resolve(import.meta.dirname, "..", "harness", "skills")

/** Route terminals — valid non-skill targets. */
const TERMINALS = new Set(["surface", "done", "mode"])

/**
 * Entry points — skills the autopilot loads directly from the
 * AUTO-CLASSIFY decision matrix in AUTOPILOT.md (line 21-36).
 */
const ENTRY_POINTS = new Set([
  "oh-planner",
  "oh-investigate",
  "oh-facade",
  "oh-security",
  "oh-health",
  "oh-ascii",
  "oh-manifest",
  "oh-review",
  "oh-plan-review",
  "oh-builder",
  "oh-handoff",
  "oh-fusion",
  "oh-expert",
])

/**
 * Direct-user-request skills — invoked by name or trigger keywords,
 * not through the routing graph. Not reachable from any entry point
 * via routes; not in the classify matrix. This is an intentional pattern:
 * the user speaks "list skills" → oh-skills-list, etc.
 */
const DIRECT_USER_SKILLS = new Set([
  "oh-browser",     // "browser automation", "open a website", "scrape data"
  "oh-freeze",      // "freeze editing", "restrict to"
  "oh-full-output", // "full output", "complete code"
  "oh-guard",       // "confirm", "safety check"
  "oh-init",        // "init project", "initialize"
  "oh-issue",       // "create issue", "break into issues"
  "oh-learn",       // "learn patterns", "extract"
  "oh-prd",         // "write PRD", "product requirements"
  "oh-refactor",    // "refactor", "clean up", "improve code"
  "oh-skills-list", // "list skills", "what can you do"
  "oh-triage",      // "triage", "classify issue"
])

// ---------------------------------------------------------------------------
// Frontmatter parser
// ---------------------------------------------------------------------------

interface SkillMeta {
  name: string
  description: string
  tier: string
  filePath: string
  route: {
    pass: string[]
    fail: string[]
    blocker: string[]
  }
  incoming: string[]
}

function parseFrontmatter(filePath: string): SkillMeta | null {
  const content = fs.readFileSync(filePath, "utf-8")
  const match = content.match(/^---\s*\n([\s\S]*?)\n---/)
  if (!match) return null

  const lines = match[1].split("\n")
  let name = ""
  let description = ""
  let tier = ""
  const passList: string[] = []
  const failList: string[] = []
  const blockerList: string[] = []

  let routeKey: "pass" | "fail" | "blocker" | null = null

  for (const raw of lines) {
    const line = raw.trimEnd()

    // List item under route block
    const listMatch = line.match(/^\s+-\s+(.+)$/)
    if (listMatch && routeKey) {
      const val = listMatch[1].trim().replace(/^["']|["']$/g, "")
      if (val) {
        if (routeKey === "pass") passList.push(val)
        else if (routeKey === "fail") failList.push(val)
        else if (routeKey === "blocker") blockerList.push(val)
      }
      continue
    }

    // Inline route key (value may be empty → list follows on next lines)
    const pMatch = line.match(/^\s+pass:\s*(.*)$/)
    const fMatch = line.match(/^\s+fail:\s*(.*)$/)
    const bMatch = line.match(/^\s+blocker:\s*(.*)$/)

    if (pMatch) {
      const val = pMatch[1].trim()
      routeKey = null
      if (val.startsWith("[")) {
        passList.push(...val.replace(/^\[|\]$/g, "").split(",").map(s => s.trim().replace(/^["']|["']$/g, "")).filter(Boolean))
      } else if (val && !val.startsWith("-")) {
        passList.push(val.replace(/^["']|["']$/g, ""))
      }
      if (!val || val.startsWith("-")) {
        routeKey = "pass"
      }
      continue
    }

    if (fMatch) {
      const val = fMatch[1].trim()
      routeKey = null
      if (val.startsWith("[")) {
        failList.push(...val.replace(/^\[|\]$/g, "").split(",").map(s => s.trim().replace(/^["']|["']$/g, "")).filter(Boolean))
      } else if (val && !val.startsWith("-")) {
        failList.push(val.replace(/^["']|["']$/g, ""))
      }
      if (!val || val.startsWith("-")) {
        routeKey = "fail"
      }
      continue
    }

    if (bMatch) {
      const val = bMatch[1].trim()
      routeKey = null
      if (val.startsWith("[")) {
        blockerList.push(...val.replace(/^\[|\]$/g, "").split(",").map(s => s.trim().replace(/^["']|["']$/g, "")).filter(Boolean))
      } else if (val && !val.startsWith("-")) {
        blockerList.push(val.replace(/^["']|["']$/g, ""))
      }
      if (!val || val.startsWith("-")) {
        routeKey = "blocker"
      }
      continue
    }

    // Top-level fields
    const m = line.match(/^name:\s*(.+)$/)
    if (m) { name = m[1].trim().replace(/^["']|["']$/g, ""); continue }
    const d = line.match(/^description:\s*(.+)$/)
    if (d) { description = d[1].trim().replace(/^["']|["']$/g, ""); continue }
    const t = line.match(/^tier:\s*(.+)$/)
    if (t) { tier = t[1].trim().replace(/^["']|["']$/g, ""); continue }

    // Non-indented line → leave route block
    if (line.length > 0 && !line.startsWith(" ")) {
      routeKey = null
    }
  }

  return { name, description, tier, filePath, incoming: [], route: { pass: passList, fail: failList, blocker: blockerList } }
}

// ---------------------------------------------------------------------------
// Load skills
// ---------------------------------------------------------------------------

function loadAllSkills(): Map<string, SkillMeta> {
  const skills = new Map<string, SkillMeta>()
  for (const entry of fs.readdirSync(SKILLS_DIR, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue
    const f = path.join(SKILLS_DIR, entry.name, "SKILL.md")
    if (!fs.existsSync(f)) continue
    const meta = parseFrontmatter(f)
    if (meta) skills.set(meta.name, meta)
  }
  return skills
}

// ---------------------------------------------------------------------------
// Tests: routing graph integrity
// ---------------------------------------------------------------------------

describe("routing graph", () => {
  const skills = loadAllSkills()
  const skillNames = new Set(skills.keys())

  // Build graph
  const outgoing = new Map<string, string[]>()
  const incoming = new Map<string, string[]>()
  for (const [name, meta] of skills) {
    const targets = [...meta.route.pass, ...meta.route.fail, ...meta.route.blocker]
    outgoing.set(name, targets)
    meta.incoming = []
    for (const t of targets) {
      if (!incoming.has(t)) incoming.set(t, [])
      incoming.get(t)!.push(name)
      if (skillNames.has(t)) {
        const s = skills.get(t)
        if (s) s.incoming.push(name)
      }
    }
  }

  // ---- 1: Parse sanity ------------------------------------------------
  it("parses all 29 skill files", () => {
    assert.ok(skills.size >= 29, `Expected >= 29 skills, got ${skills.size}`)
  })

  it("all expected entry points exist", () => {
    for (const ep of ENTRY_POINTS) {
      assert.ok(skills.has(ep), `Entry point "${ep}" not found`)
    }
  })

  it("all expected direct-user skills exist", () => {
    for (const s of DIRECT_USER_SKILLS) {
      assert.ok(skills.has(s), `Direct-user skill "${s}" not found`)
    }
  })

  // ---- 2: Route existence ---------------------------------------------
  it("every route target is a real skill or valid terminal", () => {
    // Collect user skill names
    const userSkills = new Set<string>()
    for (const dir of [
      path.join(os.homedir(), ".agents", "skills"),
      path.join(os.homedir(), ".config", "opencode", "skills"),
    ]) {
      if (fs.existsSync(dir)) {
        for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
          if (e.isDirectory()) userSkills.add(e.name)
        }
      }
    }

    const failures: string[] = []
    for (const [name, meta] of skills) {
      for (const key of ["pass", "fail", "blocker"] as const) {
        for (const target of meta.route[key]) {
          if (TERMINALS.has(target)) continue
          if (skillNames.has(target)) continue
          if (userSkills.has(target)) continue
          failures.push(`${name}.route.${key} → "${target}"`)
        }
      }
    }

    assert.equal(failures.length, 0,
      `Invalid route targets:\n  ${failures.join("\n  ")}`)
  })

  // ---- 3: Orphan detection --------------------------------------------
  it("every built-in skill is reachable (entry point, routed-to, or direct-user)", () => {
    // Skills with at least one incoming edge from another built-in skill
    const hasIncoming = new Set<string>()
    for (const [target, sources] of incoming) {
      if (skillNames.has(target)) {
        hasIncoming.add(target)
      }
    }

    const orphans: string[] = []
    for (const name of skillNames) {
      if (ENTRY_POINTS.has(name)) continue
      if (DIRECT_USER_SKILLS.has(name)) continue
      if (hasIncoming.has(name)) continue
      orphans.push(name)
    }

    assert.equal(orphans.length, 0,
      `Orphan skills (no incoming, not entry point, not direct-user):\n  ${orphans.join("\n  ")}`)
  })

  // ---- 4: BFS reachability from entry points (routing chain test) -----
  it("routing graph from entry points reaches all non-direct-user skills", () => {
    const visited = new Set(ENTRY_POINTS)
    const queue = [...ENTRY_POINTS]
    while (queue.length > 0) {
      const cur = queue.shift()!
      for (const target of outgoing.get(cur) ?? []) {
        if (!skillNames.has(target)) continue
        if (visited.has(target)) continue
        visited.add(target)
        queue.push(target)
      }
    }

    const unreachable: string[] = []
    for (const name of skillNames) {
      if (visited.has(name)) continue
      if (DIRECT_USER_SKILLS.has(name)) continue
      unreachable.push(name)
    }

    assert.equal(unreachable.length, 0,
      `Skills unreachable from entry points (not direct-user):\n  ${unreachable.join("\n  ")}`)
  })

  // ---- 5: Primitive cycle detection -----------------------------------
  it("self-loop skills match documented set (regression guard)", () => {
    // A self-loop means route.fail routes back to the same skill.
    // These are intentional retry-on-failure loops. Any NEW or MISSING
    // self-loop means someone edited a route — flag it.
    const actual = [...skillNames].filter(n => {
      const meta = skills.get(n)
      return meta!.route.fail.includes(n) || meta!.route.pass.includes(n) || meta!.route.blocker.includes(n)
    }).sort()

    const expected = [
      "oh-builder",  // fail → oh-builder (retry build)
      "oh-browser",  // fail → oh-browser (retry browser)
      "oh-expert",   // fail → oh-expert (keep diagnosing)
      "oh-facade",   // fail → oh-facade (iterate design)
      "oh-init",     // fail → oh-init (retry init)
      "oh-planner",  // fail → oh-planner (revise plan)
    ].sort()

    assert.deepEqual(actual, expected,
      `Self-loop skills changed.\nExpected: ${expected.join(", ")}\nActual:   ${actual.join(", ")}`)
  })

  it("2-node feedback cycles match documented set (regression guard)", () => {
    // Detects all directed 2-cycles: A has edge to B AND B has edge to A.
    // These are intentional plan-review-revise and build-test-fix loops,
    // bounded by the Loop Guard at runtime.
    const adj = new Map<string, Set<string>>()
    for (const [name, targets] of outgoing) {
      adj.set(name, new Set(targets.filter(t => skillNames.has(t))))
    }

    const pairsFound: string[] = []
    for (const a of skillNames) {
      const aEdges = adj.get(a)
      if (!aEdges) continue
      for (const b of aEdges) {
        if (b <= a) continue
        const bEdges = adj.get(b)
        if (bEdges && bEdges.has(a)) {
          pairsFound.push(`${a} ↔ ${b}`)
        }
      }
    }

    const actual = pairsFound.sort()
    const expected = [
      "oh-builder ↔ oh-gauntlet",       // build → test fails → fix
      "oh-grill ↔ oh-planner",          // plan → stress-test → revise
      "oh-skill-craft ↔ oh-skills-link", // craft → link → craft if link fails
    ].sort()

    assert.deepEqual(actual, expected,
      `2-node feedback cycles changed.\nExpected: ${expected.join(", ")}\nActual:   ${actual.join(", ")}`)
  })

  // ---- 6: Mode skill validation ---------------------------------------
  it("mode skills route correctly (pass=mode, fail=mode, blocker=surface)", () => {
    for (const name of ["oh-freeze", "oh-guard"]) {
      const meta = skills.get(name)
      assert.ok(meta, `${name} not found`)
      for (const target of meta!.route.pass) {
        assert.equal(target, "mode", `${name}.route.pass should be "mode"`)
      }
      for (const target of meta!.route.fail) {
        assert.equal(target, "mode", `${name}.route.fail should be "mode"`)
      }
    }
  })
})

// ---------------------------------------------------------------------------
// Tests: skill structural validation
// ---------------------------------------------------------------------------

describe("skill structure", () => {
  const skills = loadAllSkills()

  it("each skill has non-empty name", () => {
    for (const [name, meta] of skills) {
      assert.ok(name.length > 0, `Empty name at ${meta.filePath}`)
    }
  })

  it("name matches enclosing directory name", () => {
    for (const [name, meta] of skills) {
      const dirName = path.basename(path.dirname(meta.filePath))
      assert.equal(name, dirName, `"${name}" != dir "${dirName}" at ${meta.filePath}`)
    }
  })

  it("name matches pattern ^[a-z0-9]+(-[a-z0-9]+)*$", () => {
    const re = /^[a-z0-9]+(-[a-z0-9]+)*$/
    for (const [name, meta] of skills) {
      assert.ok(re.test(name), `Name "${name}" fails regex at ${meta.filePath}`)
    }
  })

  it("name does not exceed 64 chars", () => {
    for (const [name, meta] of skills) {
      assert.ok(name.length <= 64, `Name "${name}" > 64 chars at ${meta.filePath}`)
    }
  })

  it("description is non-empty", () => {
    for (const [name, meta] of skills) {
      assert.ok(meta.description.length > 0, `Empty description for ${name} at ${meta.filePath}`)
    }
  })

  it("description does not exceed 1024 chars", () => {
    for (const [name, meta] of skills) {
      assert.ok(meta.description.length <= 1024,
        `Description for ${name} is ${meta.description.length} chars at ${meta.filePath}`)
    }
  })

  it("route has pass, fail, and blocker with at least one entry each", () => {
    for (const [name, meta] of skills) {
      assert.ok(meta.route.pass.length > 0, `${name} has empty route.pass`)
      assert.ok(meta.route.fail.length > 0, `${name} has empty route.fail`)
      assert.ok(meta.route.blocker.length > 0, `${name} has empty route.blocker`)
    }
  })

  it("route.blocker is always 'surface'", () => {
    for (const [name, meta] of skills) {
      for (const target of meta.route.blocker) {
        assert.equal(target, "surface",
          `${name}.route.blocker has "${target}" — all blockers must route to "surface"`)
      }
    }
  })

  it("tier is one of 2, 3, or 4", () => {
    const valid = new Set(["2", "3", "4"])
    for (const [name, meta] of skills) {
      assert.ok(valid.has(meta.tier), `${name} has invalid tier "${meta.tier}"`)
    }
  })
})
