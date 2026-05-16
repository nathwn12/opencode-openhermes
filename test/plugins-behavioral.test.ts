import { describe, it, before, after } from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Helper: create a plan file in the canonical storage dir
function writePlanFile(projectDir: string, content: string, storageDir: string): string {
  const projectName = path.basename(projectDir)
  const planFile = path.join(storageDir, `${projectName}-plan-001.md`)
  fs.mkdirSync(storageDir, { recursive: true })
  fs.writeFileSync(planFile, content)
  return planFile
}

describe("BootstrapPlugin behavior", () => {
  let mod: any
  const tmpDirs: string[] = []

  before(async () => {
    mod = await import("../bootstrap.ts")
  })

  after(() => {
    for (const d of tmpDirs) {
      fs.rmSync(d, { recursive: true, force: true })
    }
  })

  function makePlanStorageDir(): string {
    const d = fs.mkdtempSync(path.join(os.tmpdir(), "oh-plans-"))
    tmpDirs.push(d)
    return d
  }

  it("registers package-local skills, commands, and agents", async () => {
    const plugin = await mod.BootstrapPlugin({ directory: __dirname })
    const config: Record<string, unknown> = { skills: { paths: [] }, command: {}, agent: {}, instructions: [] }

    await plugin.config(config)

    assert.ok((config.skills as { paths: string[] }).paths.some(p => p.endsWith(path.join("harness", "skills"))))
    assert.ok((config.command as Record<string, unknown>)["oh-doctor"])
    assert.ok((config.command as Record<string, unknown>)["oh-log"])
    assert.ok((config.agent as Record<string, unknown>).OpenHermes)
    assert.equal(config.default_agent, "OpenHermes")
  })

  it("loads markdown manifests into command and agent config", async () => {
    const plugin = await mod.BootstrapPlugin({ directory: __dirname })
    const config: Record<string, unknown> = { skills: { paths: [] }, command: {}, agent: {}, instructions: [] }

    await plugin.config(config)

    const cmd = (config.command as Record<string, { template: string; agent: string }>)["oh-doctor"]
    assert.match(cmd.template, /Run a structured 8-category diagnostic/)
    assert.equal(cmd.agent, "OpenHermes")

    const logCmd = (config.command as Record<string, { template: string; agent: string }>)["oh-log"]
    assert.match(logCmd.template, /OpenHermes session log/)
    assert.equal(logCmd.agent, "OpenHermes")

    const agentEntry = config.agent as Record<string, { prompt: string; mode: string }>
    assert.match(agentEntry.OpenHermes.prompt, /You are OpenHermes, an OpenCode-native orchestrator/)
    assert.equal(agentEntry.OpenHermes.mode, "primary")
  })

  it("exports compaction and session event helpers", async () => {
    const { buildCompactionContext, formatSessionEvent } = mod as {
      buildCompactionContext: (projectDir: string) => string[]
      formatSessionEvent: (event: { type: string; properties?: Record<string, unknown> }) => { level: string; message: string } | null
    }

    assert.ok(typeof buildCompactionContext === "function")
    assert.ok(typeof formatSessionEvent === "function")
  })

  it("buildCompactionContext includes plan summary when available", async () => {
    const { buildCompactionContext, setPlanStorageDirForTest } = mod as {
      buildCompactionContext: (projectDir: string) => string[]
      setPlanStorageDirForTest: (dir: string | undefined) => void
    }
    const storageDir = makePlanStorageDir()
    setPlanStorageDirForTest(storageDir)
    const projectDir = fs.mkdtempSync(path.join(os.tmpdir(), "openhermes-plan-"))
    writePlanFile(projectDir, [
      "# PLAN: openhermes",
      "Status: active",
      "Objective: Keep context intact across compaction",
    ].join("\n"), storageDir)

    const context = buildCompactionContext(projectDir)
    setPlanStorageDirForTest(undefined)
    assert.ok(context.some(line => line.includes("verify before claim")))
    assert.ok(context.some(line => line.includes("Active plan: status=active | objective=Keep context intact across compaction")))
  })

  it("formats session lifecycle events", async () => {
    const { formatSessionEvent } = mod as { formatSessionEvent: (event: { type: string; properties?: Record<string, unknown> }) => { level: string; message: string } | null }

    assert.deepEqual(formatSessionEvent({ type: "session.created", properties: { info: { id: "s-1" } } }), {
      level: "info",
      message: "session.created session=s-1",
    })
    assert.deepEqual(formatSessionEvent({ type: "session.compacted", properties: { sessionID: "s-2" } }), {
      level: "info",
      message: "session.compacted session=s-2",
    })
    assert.deepEqual(formatSessionEvent({ type: "session.error", properties: { sessionID: "s-3", error: { name: "Boom", data: { message: "nope" } } } }), {
      level: "error",
      message: "session.error session=s-3 error=Boom: nope",
    })
  })

  it("injects compaction context and preserves the active plan", async () => {
    const { setPlanStorageDirForTest } = mod as { setPlanStorageDirForTest: (dir: string | undefined) => void }
    const storageDir = makePlanStorageDir()
    setPlanStorageDirForTest(storageDir)
    const projectDir = fs.mkdtempSync(path.join(os.tmpdir(), "openhermes-project-"))
    writePlanFile(projectDir, "Status: active\nObjective: keep context\n", storageDir)

    const plugin = await mod.BootstrapPlugin({ directory: projectDir })
    const output = { context: [] as string[] }

    await plugin["experimental.session.compacting"]({ sessionID: "s-1" }, output)
    setPlanStorageDirForTest(undefined)

    assert.ok(output.context.some(line => line.includes("verify before claim")))
    assert.ok(output.context.some(line => line.includes("Active plan: status=active | objective=keep context")))
  })

  it("ensurePlanFile creates plan when none exists", () => {
    const { ensurePlanFile, setPlanStorageDirForTest } = mod as {
      ensurePlanFile: (projectDir: string) => string
      setPlanStorageDirForTest: (dir: string | undefined) => void
    }
    const storageDir = makePlanStorageDir()
    setPlanStorageDirForTest(storageDir)
    const projectDir = fs.mkdtempSync(path.join(os.tmpdir(), "oh-test-project-"))

    const planPath = ensurePlanFile(projectDir)
    setPlanStorageDirForTest(undefined)

    assert.ok(fs.existsSync(planPath), "plan file was created")
    const content = fs.readFileSync(planPath, "utf8")
    assert.match(content, /Status: active/, "plan status is active")
    assert.match(content, /\(pending classification\)/, "objective is pending")
    assert.match(content, /## Tasks/, "plan has tasks section")
    assert.match(content, /- \[ \]/, "plan has pending task")
  })

  it("ensurePlanFile reuses active plan", () => {
    const { ensurePlanFile, setPlanStorageDirForTest } = mod as {
      ensurePlanFile: (projectDir: string) => string
      setPlanStorageDirForTest: (dir: string | undefined) => void
    }
    const storageDir = makePlanStorageDir()
    setPlanStorageDirForTest(storageDir)
    const projectDir = fs.mkdtempSync(path.join(os.tmpdir(), "oh-test-project-"))

    const firstPath = ensurePlanFile(projectDir)
    const secondPath = ensurePlanFile(projectDir)
    setPlanStorageDirForTest(undefined)

    assert.equal(firstPath, secondPath, "reuses same plan file path when active")
    assert.equal(path.basename(firstPath), `${path.basename(projectDir)}-plan-001.md`, "plan is 001")
  })

  it("ensurePlanFile creates new plan when latest is complete", () => {
    const { ensurePlanFile, setPlanStorageDirForTest } = mod as {
      ensurePlanFile: (projectDir: string) => string
      setPlanStorageDirForTest: (dir: string | undefined) => void
    }
    const storageDir = makePlanStorageDir()
    setPlanStorageDirForTest(storageDir)
    const projectDir = fs.mkdtempSync(path.join(os.tmpdir(), "oh-test-project-"))

    // Create a complete plan first
    const firstPlan = ensurePlanFile(projectDir)
    const completedContent = fs.readFileSync(firstPlan, "utf8").replace("Status: active", "Status: complete")
    fs.writeFileSync(firstPlan, completedContent)

    // Now ensurePlanFile should create a new one
    const secondPlan = ensurePlanFile(projectDir)
    setPlanStorageDirForTest(undefined)

    assert.notEqual(firstPlan, secondPlan, "creates new plan when latest is complete")
    assert.ok(fs.existsSync(secondPlan), "second plan file exists")
    const content = fs.readFileSync(secondPlan, "utf8")
    assert.match(content, /Status: active/, "new plan is active")
  })

  it("buildCompactionContext works with no plan file", () => {
    const { buildCompactionContext, setPlanStorageDirForTest } = mod as {
      buildCompactionContext: (projectDir: string) => string[]
      setPlanStorageDirForTest: (dir: string | undefined) => void
    }
    const storageDir = makePlanStorageDir()
    setPlanStorageDirForTest(storageDir)
    const projectDir = fs.mkdtempSync(path.join(os.tmpdir(), "oh-no-plan-"))

    const context = buildCompactionContext(projectDir)
    setPlanStorageDirForTest(undefined)

    // Should still return operating doctrine even with no plan file
    assert.ok(context.length >= 1, "should return context even without a plan")
    assert.ok(context.some(line => line.includes("verify before claim")), "should include doctrine text")
    assert.ok(!context.some(line => line.includes("Active plan:")), "should NOT include plan summary when no plan exists")
  })

  it("delegation depth guard blocks at depth >= 5", async () => {
    // BootstrapPlugin with a clean directory so delegation depth starts at 0
    const uniqueDir = fs.mkdtempSync(path.join(os.tmpdir(), "oh-depth-test-"))
    tmpDirs.push(uniqueDir)
    const plugin = await mod.BootstrapPlugin({ directory: uniqueDir })

    // Helper: simulate calling tool.execute.before with task tool
    async function callTaskHook(): Promise<{ blocked: boolean; errorMsg?: string }> {
      const input = { tool: "task", args: { name: "oh-builder", prompt: "test" } }
      const output: { isError?: boolean; content?: { type: string; text: string }[] } = {}
      await plugin["tool.execute.before"](input, output)
      return { blocked: !!output.isError, errorMsg: output.content?.[0]?.text }
    }

    // Non-task tool calls should not affect depth
    const nonTaskInput = { tool: "read", args: { filePath: "foo.txt" } }
    const nonTaskOutput: { isError?: boolean } = {}
    await plugin["tool.execute.before"](nonTaskInput, nonTaskOutput)
    assert.equal(nonTaskOutput.isError, undefined, "non-task tool never blocked")

    // Call task hook 4 times — should NOT block
    for (let i = 0; i < 4; i++) {
      const result = await callTaskHook()
      assert.equal(result.blocked, false, `task call ${i + 1} should not block`)
    }

    // 5th call should BLOCK
    const fifth = await callTaskHook()
    assert.equal(fifth.blocked, true, "5th task call should be blocked")
    assert.ok(fifth.errorMsg?.includes("LOOP GUARD"), "block message should include LOOP GUARD")
    assert.ok(fifth.errorMsg?.includes("Delegation depth exceeded"), "block message should mention depth exceeded")
  })

  it("registers user skill paths in config.skills.paths", async () => {
    const projectDir = fs.mkdtempSync(path.join(os.tmpdir(), "oh-user-skill-"))
    tmpDirs.push(projectDir)
    const plugin = await mod.BootstrapPlugin({ directory: projectDir })
    const config: Record<string, unknown> = { skills: { paths: [] }, command: {}, agent: {}, instructions: [] }
    await plugin.config(config)

    const paths = (config.skills as { paths: string[] }).paths

    // Must include built-in harness/skills path
    assert.ok(paths.some(p => p.includes("harness") && p.includes("skills")), "built-in skills path present")

    // Must include user skill directories (use path.sep for cross-platform)
    const userAgentSkills = path.join(".agents", "skills")
    const userConfigSkills = path.join(".config", "opencode", "skills")
    const userClaudeSkills = path.join(".claude", "skills")
    assert.ok(paths.some(p => p.includes(userAgentSkills)), "~/.agents/skills path present")
    assert.ok(paths.some(p => p.includes(userConfigSkills)), "~/.config/opencode/skills path present")
    assert.ok(paths.some(p => p.includes(userClaudeSkills)), "~/.claude/skills path present")

    // User paths come after built-in (user wins on conflict)
    const harnessIdx = paths.findIndex(p => p.includes("harness") && p.includes("skills"))
    const agentsIdx = paths.findIndex(p => p.includes(userAgentSkills))
    assert.ok(harnessIdx < agentsIdx, "user skill paths should come after built-in path (user wins on conflict)")
  })

  it("ensurePlanFile creates sequential plan numbers", () => {
    const { ensurePlanFile, setPlanStorageDirForTest } = mod as {
      ensurePlanFile: (projectDir: string) => string
      setPlanStorageDirForTest: (dir: string | undefined) => void
    }
    const storageDir = makePlanStorageDir()
    setPlanStorageDirForTest(storageDir)
    const projectDir = fs.mkdtempSync(path.join(os.tmpdir(), "oh-test-project-"))

    const plan1 = ensurePlanFile(projectDir)
    assert.match(plan1, /-plan-001\.md$/, "first plan is 001")

    // Mark complete, create second
    const content1 = fs.readFileSync(plan1, "utf8").replace("Status: active", "Status: complete")
    fs.writeFileSync(plan1, content1)
    const plan2 = ensurePlanFile(projectDir)
    assert.match(plan2, /-plan-002\.md$/, "second plan is 002")

    // Mark complete, create third
    const content2 = fs.readFileSync(plan2, "utf8").replace("Status: active", "Status: complete")
    fs.writeFileSync(plan2, content2)
    const plan3 = ensurePlanFile(projectDir)
    setPlanStorageDirForTest(undefined)

    assert.match(plan3, /-plan-003\.md$/, "third plan is 003")
  })

})
