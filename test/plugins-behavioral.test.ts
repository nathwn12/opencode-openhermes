import { describe, it, before } from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))

describe("BootstrapPlugin behavior", () => {
  let mod: any

  before(async () => {
    mod = await import("../bootstrap.ts")
  })

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
    const { buildCompactionContext } = mod as { buildCompactionContext: (projectDir: string) => string[] }
    const projectDir = fs.mkdtempSync(path.join(os.tmpdir(), "openhermes-plan-"))
    fs.mkdirSync(path.join(projectDir, ".opencode"), { recursive: true })
    fs.writeFileSync(
      path.join(projectDir, ".opencode", "plan.md"),
      [
        "# PLAN: openhermes",
        "Status: active",
        "Objective: Keep context intact across compaction",
      ].join("\n"),
    )

    const context = buildCompactionContext(projectDir)
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
    const projectDir = fs.mkdtempSync(path.join(os.tmpdir(), "openhermes-project-"))
    fs.mkdirSync(path.join(projectDir, ".opencode"), { recursive: true })
    fs.writeFileSync(path.join(projectDir, ".opencode", "plan.md"), "Status: active\nObjective: keep context\n")

    const plugin = await mod.BootstrapPlugin({ directory: projectDir })
    const output = { context: [] as string[] }

    await plugin["experimental.session.compacting"]({ sessionID: "s-1" }, output)

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
