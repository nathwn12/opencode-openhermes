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
    assert.match(cmd.template, /Inspect the current OpenHermes\/OpenCode setup/)
    assert.equal(cmd.agent, "OpenHermes")

    const logCmd = (config.command as Record<string, { template: string; agent: string }>)["oh-log"]
    assert.match(logCmd.template, /OpenHermes session log/)
    assert.equal(logCmd.agent, "OpenHermes")

    const agentEntry = config.agent as Record<string, { prompt: string; mode: string }>
    assert.match(agentEntry.OpenHermes.prompt, /You are OpenHermes, the primary orchestrator/)
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

  it("injects bootstrap text only once", async () => {
    const plugin = await mod.BootstrapPlugin({ directory: __dirname })
    const output = {
      messages: [
        {
          info: { role: "user" },
          parts: [
            { type: "text", text: "actual user request" },
          ],
        },
      ],
    }

    await plugin["experimental.chat.messages.transform"]({}, output)
    await plugin["experimental.chat.messages.transform"]({}, output)

    assert.match(output.messages[0].parts[0].text!, /OPENHERMES_BOOTSTRAP/)
    assert.match(output.messages[0].parts[1].text, /actual user request/)
    assert.equal(
      output.messages[0].parts.filter(part => typeof part.text === "string" && part.text.includes("OPENHERMES_BOOTSTRAP")).length,
      1,
    )
  })
})
