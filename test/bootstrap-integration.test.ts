import { describe, it } from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"

// ---------------------------------------------------------------------------
// Bootstrap integration tests
// ---------------------------------------------------------------------------

const AGENTS_SKILLS_DIR = path.join(os.homedir(), ".agents", "skills")

describe("bootstrap integration", () => {
  let tmpDir: string
  let harnessDir: string
  let skillsDir: string
  let tempUserSkillName: string

  // -----------------------------------------------------------------------
  // Setup
  // -----------------------------------------------------------------------
  it("setUp: creates temp harness", () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "oh-test-"))
    harnessDir = path.join(tmpDir, "harness")
    skillsDir = path.join(harnessDir, "skills")

    // Minimal harness
    fs.mkdirSync(path.join(harnessDir, "codex"), { recursive: true })
    fs.writeFileSync(path.join(harnessDir, "codex", "CONSTITUTION.md"), "# Test Constitution\n")
    fs.mkdirSync(path.join(harnessDir, "instructions"), { recursive: true })
    fs.writeFileSync(path.join(harnessDir, "instructions", "RUNTIME.md"), "# Test Runtime\n")
    fs.mkdirSync(path.join(harnessDir, "commands"), { recursive: true })

    // Agents dir
    fs.mkdirSync(path.join(harnessDir, "agents"), { recursive: true })
    fs.writeFileSync(path.join(harnessDir, "agents", "openhermes.md"), "# OpenHermes\nTest agent.\n")

    // Built-in skills
    for (const s of ["oh-planner", "oh-builder", "oh-gauntlet", "oh-ship"]) {
      fs.mkdirSync(path.join(skillsDir, s), { recursive: true })
      fs.writeFileSync(path.join(skillsDir, s, "SKILL.md"), [
        "---",
        `name: ${s}`,
        `description: "Test skill ${s}"`,
        "tier: 3",
        "route:",
        "  pass: oh-gauntlet",
        "  fail: oh-builder",
        "  blocker: surface",
        "---",
      ].join("\n") + "\n\n# Body\n")
    }
  })

  // -----------------------------------------------------------------------
  // Manual count
  // -----------------------------------------------------------------------
  it("counts built-in skills correctly", () => {
    const count = fs.readdirSync(skillsDir).filter(e =>
      fs.statSync(path.join(skillsDir, e)).isDirectory() &&
      fs.existsSync(path.join(skillsDir, e, "SKILL.md"))
    ).length
    assert.equal(count, 4)
  })

  // -----------------------------------------------------------------------
  // Config callback: registers commands + agents
  // -----------------------------------------------------------------------
  it("config callback registers commands and agents", async () => {
    const { BootstrapPlugin, setHarnessRootForTest, setPlanStorageDirForTest } = await import("../bootstrap.ts")
    setHarnessRootForTest(harnessDir)
    setPlanStorageDirForTest(path.join(tmpDir, "plans"))

    const plugin = await BootstrapPlugin({ directory: tmpDir })
    const config: Record<string, unknown> = { skills: { paths: [] } }
    await plugin.config!(config)

    assert.ok(config.command, "config.command should be defined")
    assert.ok(config.agent, "config.agent should be defined")

    const agents = config.agent as Record<string, unknown>
    assert.ok(agents.OpenHermes, "OpenHermes agent should be registered")
    assert.equal((agents.OpenHermes as Record<string, unknown>).mode, "primary")
  })

  // -----------------------------------------------------------------------
  // Config callback: registers built-in skills path
  // -----------------------------------------------------------------------
  it("config callback registers built-in skill path", async () => {
    const { BootstrapPlugin, setHarnessRootForTest, setPlanStorageDirForTest } = await import("../bootstrap.ts")
    setHarnessRootForTest(harnessDir)
    setPlanStorageDirForTest(path.join(tmpDir, "plans"))

    const plugin = await BootstrapPlugin({ directory: tmpDir })
    const config: Record<string, unknown> = { skills: { paths: [] } }
    await plugin.config!(config)

    const paths = config.skills?.paths as string[] | undefined
    assert.ok(paths, "config.skills.paths should be defined")
    assert.ok(paths.some(p => p.includes("harness") && p.includes("skills")),
      "Built-in skills path should be registered")
  })

  // -----------------------------------------------------------------------
  // Config callback: user skills auto-detected from ~/.agents/skills/
  // (available_skills MUST include user skills so the AI can discover them
  //  and load them on demand via the skill tool)
  // -----------------------------------------------------------------------
  it("config callback auto-detects user skills from ~/.agents/skills/", async () => {
    // Create a temp user skill in the real user dir
    tempUserSkillName = `oh-test-${Date.now()}`
    const userSkillPath = path.join(AGENTS_SKILLS_DIR, tempUserSkillName)
    fs.mkdirSync(userSkillPath, { recursive: true })
    fs.writeFileSync(path.join(userSkillPath, "SKILL.md"), [
      "---",
      `name: ${tempUserSkillName}`,
      'description: "Temp test skill"',
      "tier: 2",
      "route:",
      "  pass: surface",
      "  fail: surface",
      "  blocker: surface",
      "---",
    ].join("\n"))

    try {
      const { BootstrapPlugin, setHarnessRootForTest, setPlanStorageDirForTest } = await import("../bootstrap.ts")
      setHarnessRootForTest(harnessDir)
      setPlanStorageDirForTest(path.join(tmpDir, "plans"))

      const plugin = await BootstrapPlugin({ directory: tmpDir })
      const config: Record<string, unknown> = { skills: { paths: [] } }
      await plugin.config!(config)

      const paths = config.skills?.paths as string[] | undefined
      assert.ok(paths, "config.skills.paths should be defined")
      assert.ok(paths.some(p => p.includes(AGENTS_SKILLS_DIR)),
        `~/.agents/skills/ dir should be in skill paths (has: ${paths.join(", ")})`)
    } finally {
      // Clean up temp user skill
      fs.rmSync(userSkillPath, { recursive: true, force: true })
    }
  })

  // -----------------------------------------------------------------------
  // ensurePlanFile creates and reuses plans
  // -----------------------------------------------------------------------
  it("ensurePlanFile creates skeleton plan", async () => {
    const { ensurePlanFile, setPlanStorageDirForTest } = await import("../bootstrap.ts")
    setPlanStorageDirForTest(path.join(tmpDir, "plans"))

    const planPath = ensurePlanFile(tmpDir)
    assert.ok(fs.existsSync(planPath), "Plan file should exist")

    const content = fs.readFileSync(planPath, "utf8")
    assert.ok(content.includes("Plan ID:"))
    assert.ok(content.includes("Status: active"))
  })

  it("ensurePlanFile reuses existing active plan", async () => {
    const { ensurePlanFile, setPlanStorageDirForTest } = await import("../bootstrap.ts")
    setPlanStorageDirForTest(path.join(tmpDir, "plans"))

    const p1 = ensurePlanFile(tmpDir)
    const p2 = ensurePlanFile(tmpDir)
    assert.equal(p1, p2, "Should reuse the same plan file")
  })

  // -----------------------------------------------------------------------
  // formatSessionEvent
  // -----------------------------------------------------------------------
  it("formatSessionEvent formats session.created", async () => {
    const { formatSessionEvent } = await import("../bootstrap.ts")
    const result = formatSessionEvent({ type: "session.created", properties: { info: { id: "test-123" } } })
    assert.equal(result?.level, "info")
    assert.ok(result?.message.includes("test-123"))
  })

  it("formatSessionEvent formats session.compacted", async () => {
    const { formatSessionEvent } = await import("../bootstrap.ts")
    const result = formatSessionEvent({ type: "session.compacted", properties: { sessionID: "sess-456" } })
    assert.equal(result?.level, "info")
    assert.ok(result?.message.includes("sess-456"))
  })

  it("formatSessionEvent formats session.error", async () => {
    const { formatSessionEvent } = await import("../bootstrap.ts")
    const result = formatSessionEvent({ type: "session.error", properties: { sessionID: "sess-789", error: new Error("boom") } })
    assert.equal(result?.level, "error")
    assert.ok(result?.message.includes("boom"))
  })

  it("formatSessionEvent returns null for unknown events", async () => {
    const { formatSessionEvent } = await import("../bootstrap.ts")
    const result = formatSessionEvent({ type: "session.unknown" as never, properties: {} as never })
    assert.equal(result, null)
  })

  // -----------------------------------------------------------------------
  // buildCompactionContext
  // -----------------------------------------------------------------------
  it("buildCompactionContext includes plan summary if plan exists", async () => {
    const { buildCompactionContext, ensurePlanFile, setPlanStorageDirForTest } = await import("../bootstrap.ts")
    setPlanStorageDirForTest(path.join(tmpDir, "plans"))
    ensurePlanFile(tmpDir)

    const context = buildCompactionContext(tmpDir)
    assert.ok(context.length >= 1)
    assert.ok(context.some(c => c.includes("Active plan")))
  })

  // -----------------------------------------------------------------------
  // Teardown
  // -----------------------------------------------------------------------
  it("tearDown: removes temp dir and resets global state", async () => {
    // Reset any global test overrides so other test files are not affected
    const { setHarnessRootForTest, setPlanStorageDirForTest } = await import("../bootstrap.ts")
    setHarnessRootForTest(undefined)
    setPlanStorageDirForTest(undefined)

    if (tmpDir && fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true })
    }
  })
})
