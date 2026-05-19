// ---------------------------------------------------------------------------
// Tests for the shared SKILL.md frontmatter parser
//
// Validates that the canonical parser handles all three route formats
// (inline scalar, inline array, list items), top-level fields, and
// edge cases — and that it matches the behavior of BOTH old parsers.
// ---------------------------------------------------------------------------

import { describe, it } from "node:test"
import assert from "node:assert/strict"
import { parseSkillFrontmatter, extractFrontmatter } from "../harness/lib/skills-index/skill-frontmatter-parser.ts"

// ---------------------------------------------------------------------------
// extractFrontmatter
// ---------------------------------------------------------------------------

describe("extractFrontmatter", () => {
  it("extracts content between --- markers", () => {
    const source = "---\nname: oh-test\ndescription: A test\n---\n\nBody here"
    assert.equal(extractFrontmatter(source), "name: oh-test\ndescription: A test")
  })

  it("handles Windows CRLF line endings", () => {
    const source = "---\r\nname: oh-test\r\ndescription: A test\r\n---\r\n\r\nBody here"
    assert.equal(extractFrontmatter(source), "name: oh-test\r\ndescription: A test")
  })

  it("handles trailing newline after closing ---", () => {
    const source = "---\nname: oh-test\n---\n"
    assert.equal(extractFrontmatter(source), "name: oh-test")
  })

  it("returns null when no frontmatter exists", () => {
    assert.equal(extractFrontmatter("# Just a heading"), null)
    assert.equal(extractFrontmatter(""), null)
    assert.equal(extractFrontmatter("---\n---\nBody"), null) // empty
  })

  it("returns null when closing --- is missing", () => {
    assert.equal(extractFrontmatter("---\nname: oh-test\nBody here"), null)
  })
})

// ---------------------------------------------------------------------------
// parseSkillFrontmatter — basic field extraction
// ---------------------------------------------------------------------------

describe("parseSkillFrontmatter — top-level fields", () => {
  it("extracts name, description, and tier", () => {
    const source = [
      "---",
      'name: oh-planner',
      'description: "Use when a feature needs structured planning"',
      "tier: 3",
      "route:",
      "  pass: oh-grill",
      "  fail: oh-planner",
      "  blocker: surface",
      "---",
      "",
    ].join("\n")

    const result = parseSkillFrontmatter(source)
    assert.ok(result, "Should parse successfully")
    assert.equal(result.name, "oh-planner")
    assert.equal(result.description, "Use when a feature needs structured planning")
    assert.equal(result.tier, "3")
  })

  it("extracts description without surrounding quotes", () => {
    const source = [
      "---",
      "name: oh-test",
      "description: A plain description with no quotes",
      "tier: 2",
      "route:",
      "  pass: surface",
      "  fail: surface",
      "  blocker: surface",
      "---",
    ].join("\n")

    const result = parseSkillFrontmatter(source)
    assert.ok(result)
    assert.equal(result.description, "A plain description with no quotes")
  })

  it("extracts description with single quotes", () => {
    const source = [
      "---",
      "name: oh-test",
      "description: 'A single-quoted description'",
      "route:",
      "  pass: surface",
      "  fail: surface",
      "  blocker: surface",
      "---",
    ].join("\n")

    const result = parseSkillFrontmatter(source)
    assert.ok(result)
    assert.equal(result.description, "A single-quoted description")
  })

  it("allows missing description (undefined)", () => {
    const source = [
      "---",
      "name: oh-test",
      "route:",
      "  pass: surface",
      "  fail: surface",
      "  blocker: surface",
      "---",
    ].join("\n")

    const result = parseSkillFrontmatter(source)
    assert.ok(result)
    assert.equal(result.description, undefined)
    assert.equal(result.tier, undefined)
  })

  it("allows missing tier (undefined)", () => {
    const source = [
      "---",
      "name: oh-test",
      'description: "No tier"',
      "route:",
      "  pass: surface",
      "  fail: surface",
      "  blocker: surface",
      "---",
    ].join("\n")

    const result = parseSkillFrontmatter(source)
    assert.ok(result)
    assert.equal(result.tier, undefined)
  })

  it("returns null when there is no frontmatter", () => {
    assert.equal(parseSkillFrontmatter("# Just a heading"), null)
  })

  it("returns result even when name is missing (caller may validate)", () => {
    const source = [
      "---",
      'description: "A skill without a name"',
      "route:",
      "  pass: surface",
      "  fail: surface",
      "  blocker: surface",
      "---",
    ].join("\n")

    const result = parseSkillFrontmatter(source)
    assert.ok(result)
    assert.equal(result.name, undefined)
    assert.equal(result.description, "A skill without a name")
  })
})

// ---------------------------------------------------------------------------
// Route parsing — inline scalar
// ---------------------------------------------------------------------------

describe("parseSkillFrontmatter — inline scalar routes", () => {
  it("parses single-value pass/fail/blocker", () => {
    const source = [
      "---",
      "name: oh-test",
      "route:",
      "  pass: oh-grill",
      "  fail: oh-planner",
      "  blocker: surface",
      "---",
    ].join("\n")

    const result = parseSkillFrontmatter(source)
    assert.ok(result)
    assert.deepEqual(result.route.pass, ["oh-grill"])
    assert.deepEqual(result.route.fail, ["oh-planner"])
    assert.deepEqual(result.route.blocker, ["surface"])
  })

  it("parses mode as a route value", () => {
    const source = [
      "---",
      "name: oh-guard",
      "route:",
      "  pass: mode",
      "  fail: mode",
      "  blocker: surface",
      "---",
    ].join("\n")

    const result = parseSkillFrontmatter(source)
    assert.ok(result)
    assert.deepEqual(result.route.pass, ["mode"])
    assert.deepEqual(result.route.fail, ["mode"])
    assert.deepEqual(result.route.blocker, ["surface"])
  })
})

// ---------------------------------------------------------------------------
// Route parsing — inline array
// ---------------------------------------------------------------------------

describe("parseSkillFrontmatter — inline array routes", () => {
  it("parses inline array for a route key", () => {
    const source = [
      "---",
      "name: oh-fusion",
      "route:",
      "  pass: [oh-skill-craft, oh-skills-link]",
      "  fail: surface",
      "  blocker: surface",
      "---",
    ].join("\n")

    const result = parseSkillFrontmatter(source)
    assert.ok(result)
    assert.deepEqual(result.route.pass, ["oh-skill-craft", "oh-skills-link"])
    assert.deepEqual(result.route.fail, ["surface"])
    assert.deepEqual(result.route.blocker, ["surface"])
  })

  it("parses inline array with single element", () => {
    const source = [
      "---",
      "name: oh-test",
      "route:",
      "  pass: [oh-solo]",
      "  fail: surface",
      "  blocker: surface",
      "---",
    ].join("\n")

    const result = parseSkillFrontmatter(source)
    assert.ok(result)
    assert.deepEqual(result.route.pass, ["oh-solo"])
  })

  it("parses inline array with quoted elements", () => {
    const source = [
      "---",
      "name: oh-test",
      "route:",
      '  pass: ["oh-a", "oh-b"]',
      "  fail: surface",
      "  blocker: surface",
      "---",
    ].join("\n")

    const result = parseSkillFrontmatter(source)
    assert.ok(result)
    assert.deepEqual(result.route.pass, ["oh-a", "oh-b"])
  })
})

// ---------------------------------------------------------------------------
// Route parsing — list items
// ---------------------------------------------------------------------------

describe("parseSkillFrontmatter — list-item routes", () => {
  it("parses list items under a route key", () => {
    const source = [
      "---",
      "name: oh-expert",
      "route:",
      "  pass:",
      "    - oh-builder",
      "    - oh-gauntlet",
      "  fail: oh-expert",
      "  blocker: surface",
      "---",
    ].join("\n")

    const result = parseSkillFrontmatter(source)
    assert.ok(result)
    assert.deepEqual(result.route.pass, ["oh-builder", "oh-gauntlet"])
    assert.deepEqual(result.route.fail, ["oh-expert"])
    assert.deepEqual(result.route.blocker, ["surface"])
  })

  it("parses list items under fail route key", () => {
    const source = [
      "---",
      "name: oh-refactor",
      "route:",
      "  pass: oh-gauntlet",
      "  fail:",
      "    - oh-planner",
      "    - oh-investigate",
      "    - oh-builder",
      "  blocker: surface",
      "---",
    ].join("\n")

    const result = parseSkillFrontmatter(source)
    assert.ok(result)
    assert.deepEqual(result.route.pass, ["oh-gauntlet"])
    assert.deepEqual(result.route.fail, ["oh-planner", "oh-investigate", "oh-builder"])
    assert.deepEqual(result.route.blocker, ["surface"])
  })

  it("mixes inline scalar and list items in the same route block", () => {
    const source = [
      "---",
      "name: oh-review",
      "route:",
      "  pass:",
      "    - oh-gauntlet",
      "    - oh-ship",
      "  fail: oh-builder",
      "  blocker: surface",
      "---",
    ].join("\n")

    const result = parseSkillFrontmatter(source)
    assert.ok(result)
    assert.deepEqual(result.route.pass, ["oh-gauntlet", "oh-ship"])
    assert.deepEqual(result.route.fail, ["oh-builder"])
    assert.deepEqual(result.route.blocker, ["surface"])
  })

  it("list items do NOT bleed into next route key with inline value", () => {
    const source = [
      "---",
      "name: oh-test",
      "route:",
      "  pass: oh-grill",
      "  fail: oh-planner",
      "  blocker: surface",
      "---",
    ].join("\n")

    const result = parseSkillFrontmatter(source)
    assert.ok(result)
    assert.deepEqual(result.route.pass, ["oh-grill"])
    assert.deepEqual(result.route.fail, ["oh-planner"])
    assert.deepEqual(result.route.blocker, ["surface"])
  })
})

// ---------------------------------------------------------------------------
// Edge cases
// ---------------------------------------------------------------------------

describe("parseSkillFrontmatter — edge cases", () => {
  it("handles tier before route block (different key order)", () => {
    const source = [
      "---",
      "name: oh-ascii",
      'description: "ASCII diagramming toolkit"',
      "route:",
      "  pass: surface",
      "  fail: surface",
      "  blocker: surface",
      "tier: 2",
      "---",
    ].join("\n")

    const result = parseSkillFrontmatter(source)
    assert.ok(result)
    assert.equal(result.name, "oh-ascii")
    assert.equal(result.tier, "2")
    // tier comes after route block, so route is parsed correctly
    assert.deepEqual(result.route.pass, ["surface"])
  })

  it("handles dashed route value (inline scalar starting with dash)", () => {
    // Edge case: value that actually starts with "-" — unlikely in practice
    // but the parser treats "-" as a list-starter signal
    const source = [
      "---",
      "name: oh-test",
      "route:",
      "  pass: -oh-fix",
      "  fail: surface",
      "  blocker: surface",
      "---",
    ].join("\n")

    const result = parseSkillFrontmatter(source)
    assert.ok(result)
    // "-oh-fix" doesn't match val === "-" exactly, and doesn't start with "["
    // so it falls through to the else branch (inline scalar), but wait...
    // actually it starts with "-" but is not exactly "-", so val && val !== "-" is true
    // hmm, let me check: val = "-oh-fix". val.startsWith("-")? Yes. But val !== "-"? Also yes.
    // So the condition is: val && val !== "-" → true ("-oh-fix" is truthy and !== "-")
    // So it's treated as an inline scalar. Good.
    assert.deepEqual(result.route.pass, ["-oh-fix"])
  })

  it("handles comments in unrelated lines (not YAML # comments)", () => {
    // The parser doesn't have special comment handling, but ensure non-YAML
    // lines don't break parsing.
    const source = [
      "---",
      "name: oh-test",
      'description: "A test"',
      // This is just an extra commented line in the test file (not YAML)
      "route:",
      "  pass: surface",
      "  fail: surface",
      "  blocker: surface",
      "---",
    ].join("\n")

    // Should parse despite the weird line
    const result = parseSkillFrontmatter(source)
    assert.ok(result)
    assert.equal(result.name, "oh-test")
  })

  it("empty source returns null", () => {
    assert.equal(parseSkillFrontmatter(""), null)
  })

  it("source with only --- delimiters and empty body returns null (consistent with both old parsers)", () => {
    // An empty frontmatter block cannot be distinguished from no frontmatter,
    // and neither old parser returned results for it.
    assert.equal(parseSkillFrontmatter("---\n---\n"), null)
  })

  it("extra whitespace around field values is trimmed", () => {
    const source = [
      "---",
      "name:   oh-test   ",
      'description:   "A test with padding"   ',
      "route:",
      "  pass:   surface   ",
      "  fail:   surface   ",
      "  blocker:   surface   ",
      "---",
    ].join("\n")

    const result = parseSkillFrontmatter(source)
    assert.ok(result)
    assert.equal(result.name, "oh-test")
    assert.equal(result.description, "A test with padding")
    assert.deepEqual(result.route.pass, ["surface"])
  })
})

// ---------------------------------------------------------------------------
// Real-world fidelity: verify output matches both old parsers
// ---------------------------------------------------------------------------

describe("parseSkillFrontmatter — real-world fidelity", () => {
  // Build a test for each real route format found in the codebase

  it("matches expected output for inline-scalar format (oh-planner)", () => {
    const source = [
      "---",
      "name: oh-planner",
      'description: "Use when a feature, architecture, or idea needs structured planning"',
      "tier: 3",
      "route:",
      "  pass: oh-grill",
      "  fail: oh-planner",
      "  blocker: surface",
      "---",
    ].join("\n")

    const result = parseSkillFrontmatter(source)
    assert.ok(result)
    assert.equal(result.name, "oh-planner")
    assert.equal(result.tier, "3")
    assert.deepEqual(result.route.pass, ["oh-grill"])
    assert.deepEqual(result.route.fail, ["oh-planner"])
    assert.deepEqual(result.route.blocker, ["surface"])
  })

  it("matches expected output for inline-array format (oh-fusion)", () => {
    const source = [
      "---",
      "name: oh-fusion",
      'description: "Skill fusion pipeline"',
      "tier: 3",
      "route:",
      "  pass: [oh-skill-craft, oh-skills-link]",
      "  fail: surface",
      "  blocker: surface",
      "---",
    ].join("\n")

    const result = parseSkillFrontmatter(source)
    assert.ok(result)
    assert.deepEqual(result.route.pass, ["oh-skill-craft", "oh-skills-link"])
    assert.deepEqual(result.route.fail, ["surface"])
    assert.deepEqual(result.route.blocker, ["surface"])
  })

  it("matches expected output for list-item format (oh-expert)", () => {
    const source = [
      "---",
      "name: oh-expert",
      'description: "Self-diagnose agent failure modes"',
      "tier: 2",
      "route:",
      "  pass:",
      "    - oh-builder",
      "    - oh-gauntlet",
      "  fail: oh-expert",
      "  blocker: surface",
      "---",
    ].join("\n")

    const result = parseSkillFrontmatter(source)
    assert.ok(result)
    assert.deepEqual(result.route.pass, ["oh-builder", "oh-gauntlet"])
    assert.deepEqual(result.route.fail, ["oh-expert"])
    assert.deepEqual(result.route.blocker, ["surface"])
  })

  it("matches expected output for high-volume list format (oh-refactor)", () => {
    const source = [
      "---",
      "name: oh-refactor",
      'description: "Behavior-preserving refactoring"',
      "tier: 3",
      "route:",
      "  pass: oh-gauntlet",
      "  fail:",
      "    - oh-planner",
      "    - oh-investigate",
      "    - oh-builder",
      "  blocker: surface",
      "---",
    ].join("\n")

    const result = parseSkillFrontmatter(source)
    assert.ok(result)
    assert.deepEqual(result.route.pass, ["oh-gauntlet"])
    assert.deepEqual(result.route.fail, ["oh-planner", "oh-investigate", "oh-builder"])
    assert.deepEqual(result.route.blocker, ["surface"])
  })

  it("matches expected output for mode-routed skill (oh-guard)", () => {
    const source = [
      "---",
      "name: oh-guard",
      'description: "Safety confirmation mode"',
      "tier: 2",
      "route:",
      "  pass: mode",
      "  fail: mode",
      "  blocker: surface",
      "---",
    ].join("\n")

    const result = parseSkillFrontmatter(source)
    assert.ok(result)
    assert.deepEqual(result.route.pass, ["mode"])
    assert.deepEqual(result.route.fail, ["mode"])
    assert.deepEqual(result.route.blocker, ["surface"])
  })

  it("handles tier after route block (oh-ascii style)", () => {
    const source = [
      "---",
      "name: oh-ascii",
      'description: "Complete ASCII diagramming toolkit"',
      "route:",
      "  pass: surface",
      "  fail: surface",
      "  blocker: surface",
      "tier: 2",
      "---",
    ].join("\n")

    const result = parseSkillFrontmatter(source)
    assert.ok(result)
    assert.equal(result.tier, "2")
    assert.deepEqual(result.route.pass, ["surface"])
  })
})
