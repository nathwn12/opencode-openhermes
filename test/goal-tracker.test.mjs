import { describe, it } from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import os from "node:os"

const TEMP_DIR = path.join(os.tmpdir(), "oh-goal-tracker-test-" + Date.now())
const FAKE_HARNESS = path.join(TEMP_DIR, "harness")
const FAKE_TEMPLATES = path.join(FAKE_HARNESS, "templates")

function setup() {
  fs.mkdirSync(FAKE_TEMPLATES, { recursive: true })
  fs.writeFileSync(path.join(FAKE_TEMPLATES, "GOAL.md.tmpl"), [
    "# {TITLE} — GOAL.md",
    "",
    "> {ONE_LINE_MISSION}",
    "",
    "## Status",
    "**Current**: {STATUS}",
    "**Started**: {START_DATE}",
    "**ETA**: {ETA_DATE}",
    "",
    "## Progress",
    "{PHASES}",
    "",
    "## Blockers",
    "{BLOCKERS}",
    "",
    "## Receipts",
    "{PLAN_PATH}",
    "",
    "## Next",
    "{NEXT_ACTION}",
  ].join("\n"), "utf8")
  fs.writeFileSync(path.join(FAKE_TEMPLATES, "HANDOVER.md.tmpl"), [
    "# HANDOVER — {SESSION_NAME}",
    "",
    "## Summary",
    "{SUMMARY}",
    "",
    "## Reason",
    "{REASON}",
    "",
    "## State Snapshot",
    "- Commands: {COMMANDS_COUNT}",
    "- Subagents: {SUBAGENTS_COUNT}",
    "- Skills: {SKILLS_COUNT}",
    "- Tests: {TESTS_PASSED}/{TESTS_TOTAL}",
    "- Git: {GIT_BRANCH} @ {GIT_HASH}",
    "",
    "## Decisions Made",
    "{DECISIONS}",
    "",
    "## Blockers",
    "{BLOCKERS}",
    "",
    "## Remaining Work",
    "{REMAINING}",
    "",
    "## Context for Next Agent",
    "{NEXT_CONTEXT}",
    "",
    "## Receipts",
    "{RECEIPTS}",
  ].join("\n"), "utf8")
  return { TEMP_DIR, FAKE_HARNESS, FAKE_TEMPLATES }
}

function cleanup() {
  fs.rmSync(TEMP_DIR, { recursive: true, force: true })
}

describe("goal-tracker", () => {
  let mod

  it("loads module without errors", async () => {
    mod = await import("../lib/goal-tracker.mjs")
    assert.ok(typeof mod.generateGoalMd === "function")
    assert.ok(typeof mod.updateGoalMdStatus === "function")
    assert.ok(typeof mod.generateHandover === "function")
    assert.ok(typeof mod.resolveSessionDir === "function")
    assert.ok(typeof mod.writeReceipt === "function")
  })

  it("setHarnessDirForTest and resolveHarnessDir", () => {
    const { FAKE_HARNESS } = setup()
    try {
      mod.setHarnessDirForTest(FAKE_HARNESS)
      const dir = mod.resolveHarnessDir()
      assert.strictEqual(dir, FAKE_HARNESS)
    } finally {
      mod.setHarnessDirForTest(null)
      cleanup()
    }
  })

  it("generateGoalMd writes file with replaced placeholders", () => {
    const { FAKE_HARNESS } = setup()
    try {
      mod.setHarnessDirForTest(FAKE_HARNESS)
      const fp = mod.generateGoalMd({
        title: "Test Fusion",
        mission: "Test the goal tracker",
        status: "in-progress",
        startDate: "2026-05-13",
        phases: [
          { name: "Phase 0: Setup", done: true },
          { name: "Phase 1: Build", done: false },
        ],
        planPath: "PLAN.md",
        nextAction: "Run tests",
      })
      assert.ok(fs.existsSync(fp))
      const content = fs.readFileSync(fp, "utf8")
      assert.match(content, /Test Fusion/)
      assert.match(content, /Test the goal tracker/)
      assert.match(content, /\*\*Current\*\*: in-progress/)
      assert.match(content, /\[x\] Phase 0: Setup/)
      assert.match(content, /\[ \] Phase 1: Build/)
      assert.match(content, /Next\s*\n\s*Run tests/)
    } finally {
      mod.setHarnessDirForTest(null)
      cleanup()
    }
  })

  it("generateHandover writes file with replaced placeholders", () => {
    const { FAKE_HARNESS } = setup()
    try {
      mod.setHarnessDirForTest(FAKE_HARNESS)
      const fp = mod.generateHandover({
        sessionName: "fusion",
        summary: "Completed Phase 4",
        reason: "AGENT_SWITCH",
        stateSnapshot: {
          commands: 29,
          subagents: 31,
          skills: 15,
          testsPassed: 177,
          testsTotal: 177,
          gitBranch: "master",
          gitHash: "abc123",
        },
        decisions: ["Use ESM modules"],
        nextContext: "Continue with Phase 5",
      })
      assert.ok(fs.existsSync(fp))
      const content = fs.readFileSync(fp, "utf8")
      assert.match(content, /fusion/)
      assert.match(content, /Completed Phase 4/)
      assert.match(content, /Commands: 29/)
      assert.match(content, /Subagents: 31/)
      assert.match(content, /Git: master @ abc123/)
      assert.match(content, /Use ESM modules/)
      assert.match(content, /Continue with Phase 5/)
    } finally {
      mod.setHarnessDirForTest(null)
      cleanup()
    }
  })

  it("updateGoalMdStatus marks phase done", () => {
    const { FAKE_HARNESS } = setup()
    try {
      mod.setHarnessDirForTest(FAKE_HARNESS)
      const sessionDir = path.join(TEMP_DIR, "test-session")
      fs.mkdirSync(sessionDir, { recursive: true })
      fs.writeFileSync(path.join(sessionDir, "GOAL.md"), [
        "# Test",
        "",
        "## Progress",
        "- [ ] Phase 1: Setup",
        "- [ ] Phase 2: Build",
      ].join("\n"), "utf8")

      mod.updateGoalMdStatus(sessionDir, "Phase 2: Build", "done")
      const content = fs.readFileSync(path.join(sessionDir, "GOAL.md"), "utf8")
      assert.match(content, /\[ \] Phase 1: Setup/)
      assert.match(content, /\[x\] Phase 2: Build/)
    } finally {
      mod.setHarnessDirForTest(null)
      cleanup()
    }
  })

  it("resolveSessionDir creates fallback dir", () => {
    const { FAKE_HARNESS } = setup()
    try {
      mod.setHarnessDirForTest(FAKE_HARNESS)
      const dir = mod.resolveSessionDir("custom-session")
      assert.ok(fs.existsSync(dir))
      assert.ok(dir.endsWith("custom-session"))
    } finally {
      mod.setHarnessDirForTest(null)
      cleanup()
    }
  })

  it("writeReceipt creates receipt file", () => {
    const { FAKE_HARNESS } = setup()
    try {
      mod.setHarnessDirForTest(FAKE_HARNESS)
      const fp = mod.writeReceipt("Test receipt content", "checkpoint")
      assert.ok(fs.existsSync(fp))
      assert.ok(fp.includes("checkpoint-"))
      const content = fs.readFileSync(fp, "utf8")
      assert.strictEqual(content, "Test receipt content")
    } finally {
      mod.setHarnessDirForTest(null)
      cleanup()
    }
  })
})
