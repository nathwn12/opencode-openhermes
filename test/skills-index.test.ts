import { describe, it, before, after } from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import os from "node:os"
import { buildSkillsIndex, formatSkillsIndexFragment, serializeCompactJson, type SkillsIndex } from "../harness/lib/skills-index/index.ts"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeTempDir(): string {
  return fs.mkdtempSync(path.join(fs.realpathSync(os.tmpdir()), "oh-skills-index-"))
}

function writeSkill(root: string, name: string, frontmatter: Record<string, string>, route?: Record<string, string | string[]>): void {
  const dir = path.join(root, name)
  fs.mkdirSync(dir, { recursive: true })

  const lines = ["---"]
  const fm = { ...frontmatter }
  if (fm.name === undefined) fm.name = name
  for (const [k, v] of Object.entries(fm)) {
    lines.push(`${k}: ${v}`)
  }
  if (route) {
    lines.push("route:")
    for (const [k, v] of Object.entries(route)) {
      if (Array.isArray(v)) {
        if (v.length === 0) {
          lines.push(`  ${k}: []`)
        } else if (v.length === 1) {
          lines.push(`  ${k}: ${v[0]}`)
        } else if (v.every(s => !s.includes(" "))) {
          // Inline array format for short strings
          lines.push(`  ${k}: [${v.join(", ")}]`)
        } else {
          lines.push(`  ${k}:`)
          for (const item of v) {
            lines.push(`    - ${item}`)
          }
        }
      } else {
        lines.push(`  ${k}: ${v}`)
      }
    }
  }
  lines.push("---")
  lines.push("")

  fs.writeFileSync(path.join(dir, "SKILL.md"), lines.join("\n"))
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("skills index", () => {
  let tmpDir: string

  before(() => {
    tmpDir = makeTempDir()
  })

  after(() => {
    if (tmpDir && fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true })
    }
  })

  // -----------------------------------------------------------------------
  // 1. Generates index for all 33 OH built-in skills
  // -----------------------------------------------------------------------
  it("generates index for all 33 OH built-in skills", () => {
    const realSkillsDir = path.resolve(import.meta.dirname, "..", "harness", "skills")
    const index = buildSkillsIndex([realSkillsDir])

    // Should have at least 33 entries — allow for future additions
    const count = Object.keys(index).length
    assert.ok(count >= 33, `Expected >= 33 skills, got ${count}`)

    // Verify some known skills exist
    assert.ok("oh-planner" in index, "oh-planner should be in index")
    assert.ok("oh-builder" in index, "oh-builder should be in index")
    assert.ok("oh-gauntlet" in index, "oh-gauntlet should be in index")
    assert.ok("oh-ship" in index, "oh-ship should be in index")

    // Verify basic structure
    for (const [skillName, entry] of Object.entries(index)) {
      assert.ok(typeof entry.description === "string", `${skillName} should have description`)
      assert.ok(entry.description.length > 0, `${skillName} description should not be empty`)
      assert.ok(["core", "dynamic", "niche"].includes(entry.tier), `${skillName} tier should be valid`)
    }
  })

  // -----------------------------------------------------------------------
  // 2. Tier assignment: skills in OH harness path get "core"
  // -----------------------------------------------------------------------
  it("assigns core tier to skills in OH harness path", () => {
    // Create a skill in a path that we'll pass as first (built-in) dir
    writeSkill(path.join(tmpDir, "builtin", "skills"), "oh-test-core", {
      description: "A core skill for testing",
    }, { pass: "surface", fail: "surface", blocker: "surface" })

    // Create a skill in a second (user) path
    writeSkill(path.join(tmpDir, "external", "skills"), "oh-test-niche", {
      description: "A niche skill for testing",
    }, { pass: "surface", fail: "surface", blocker: "surface" })

    const index = buildSkillsIndex([
      path.join(tmpDir, "builtin", "skills"),
      path.join(tmpDir, "external", "skills"),
    ])

    assert.equal(index["oh-test-core"]?.tier, "core", "Skill in first path should be core")
    assert.equal(index["oh-test-niche"]?.tier, "niche", "Skill in external path should be niche")
  })

  // -----------------------------------------------------------------------
  // 3. Name conflict resolution: later paths override earlier
  // -----------------------------------------------------------------------
  it("later paths override earlier on name conflict", () => {
    const dir1 = path.join(tmpDir, "override-a")
    const dir2 = path.join(tmpDir, "override-b")

    writeSkill(dir1, "oh-conflict", {
      description: "Original description",
    }, { pass: "surface", fail: "surface", blocker: "surface" })

    writeSkill(dir2, "oh-conflict", {
      description: "Overridden description",
    }, { pass: "surface", fail: "surface", blocker: "surface" })

    const index = buildSkillsIndex([dir1, dir2])
    assert.equal(index["oh-conflict"]?.description, "Overridden description",
      "Later path should override earlier path")
  })

  // -----------------------------------------------------------------------
  // 4. Empty directory produces empty index
  // -----------------------------------------------------------------------
  it("empty directory produces empty index", () => {
    const empty = path.join(tmpDir, "empty-skills")
    fs.mkdirSync(empty, { recursive: true })

    const index = buildSkillsIndex([empty])
    assert.equal(Object.keys(index).length, 0)
  })

  // -----------------------------------------------------------------------
  // 5. Missing frontmatter produces no entry
  // -----------------------------------------------------------------------
  it("missing frontmatter produces no entry", () => {
    const dir = path.join(tmpDir, "no-frontmatter")
    const skillDir = path.join(dir, "oh-no-fm")
    fs.mkdirSync(skillDir, { recursive: true })
    fs.writeFileSync(path.join(skillDir, "SKILL.md"), "# Just a heading\n\nNo frontmatter here.\n")

    const index = buildSkillsIndex([dir])
    assert.equal("oh-no-fm" in index, false, "Skill without frontmatter should not appear in index")
  })

  // -----------------------------------------------------------------------
  // 6. Frontmatter without name produces graceful skip
  // -----------------------------------------------------------------------
  it("frontmatter without name field produces graceful skip", () => {
    const dir = path.join(tmpDir, "no-name")
    const skillDir = path.join(dir, "oh-no-name")
    fs.mkdirSync(skillDir, { recursive: true })
    fs.writeFileSync(path.join(skillDir, "SKILL.md"), [
      "---",
      "description: A skill without a name field",
      "tier: 2",
      "route:",
      "  pass: surface",
      "  fail: surface",
      "  blocker: surface",
      "---",
    ].join("\n") + "\n")

    const index = buildSkillsIndex([dir])
    assert.equal(Object.keys(index).length, 0, "No entry should be created without a name field")
  })

  // -----------------------------------------------------------------------
  // 7. Index output is valid JSON and < 5000 bytes for 33 skills
  // -----------------------------------------------------------------------
  it("compact JSON is valid and under 5000 bytes for all OH skills", () => {
    const realSkillsDir = path.resolve(import.meta.dirname, "..", "harness", "skills")
    const index = buildSkillsIndex([realSkillsDir])

    // Use the compact serializer with abbreviated keys (d/t/r) and route-as-array
    const json = serializeCompactJson(index)

    // Validate it's parseable JSON
    assert.doesNotThrow(() => JSON.parse(json), "Output should be valid JSON")

    // Check size
    const byteLen = Buffer.byteLength(json, "utf8")
    assert.ok(byteLen < 5000, `Compact JSON should be < 5000 bytes, got ${byteLen}`)
  })

  // -----------------------------------------------------------------------
  // Bonus: formatSkillsIndexFragment produces the correct fragment format
  // -----------------------------------------------------------------------
  it("formatSkillsIndexFragment produces markdown with embedded JSON", () => {
    const index: SkillsIndex = {
      "oh-test": {
        description: "A test skill for coverage",
        tier: "core",
        route: { pass: "surface", fail: "surface", blocker: "surface" },
      },
    }

    const fragment = formatSkillsIndexFragment(index)
    assert.ok(fragment.startsWith("## Skills Index"), "Should start with heading")
    assert.ok(fragment.includes("```json"), "Should contain JSON code block")
    assert.ok(fragment.includes("```"), "Should close code block")
    assert.ok(fragment.includes("A test skill"), "Should contain description")
    assert.ok(fragment.includes("core"), "Should contain tier")
    assert.ok(fragment.includes("d=description"), "Should contain key legend")

    // Verify the JSON portion is parseable and uses compact format
    const jsonMatch = fragment.match(/```json\n([\s\S]*?)```/)
    assert.ok(jsonMatch, "Should have a JSON block")
    const parsed = JSON.parse(jsonMatch[1]!)
    assert.ok(parsed["oh-test"], "Parsed JSON should have oh-test key")
    // Compact keys
    assert.equal(parsed["oh-test"].d, "A test skill for coverage", "Compact key 'd' should hold description")
    assert.equal(parsed["oh-test"].t, "core", "Compact key 't' should hold tier")
    // Route as array [pass, fail, blocker]
    assert.ok(Array.isArray(parsed["oh-test"].r), "Route should be serialized as array")
    assert.equal(parsed["oh-test"].r[0], "surface", "Route[0] should be pass target")
    assert.equal(parsed["oh-test"].r[1], "surface", "Route[1] should be fail target")
    assert.equal(parsed["oh-test"].r[2], "surface", "Route[2] should be blocker target")
  })
})
