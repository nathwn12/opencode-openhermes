import { describe, it, before } from "node:test"
import assert from "node:assert/strict"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))

describe("BootstrapPlugin behavior", () => {
  let mod: {
    BootstrapPlugin: (ctx?: { directory?: string }) => Promise<{
      config: (cfg: Record<string, unknown>) => Promise<void>
      "experimental.chat.messages.transform": (_input: unknown, output: { messages?: Array<{ info?: { role?: string }; parts?: Array<{ text?: string; type?: string }> }> }) => Promise<void>
    }>
  }

  before(async () => {
    mod = await import("../bootstrap.ts")
  })

  it("registers package-local skills, commands, and agents", async () => {
    const plugin = await mod.BootstrapPlugin({ directory: __dirname })
    const config: Record<string, unknown> = { skills: { paths: [] }, command: {}, agent: {}, instructions: [] }

    await plugin.config(config)

    assert.ok((config.skills as { paths: string[] }).paths.some(p => p.endsWith(path.join("harness", "skills"))))
    assert.ok((config.command as Record<string, unknown>)["oh-doctor"])
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

    const agentEntry = config.agent as Record<string, { prompt: string; mode: string }>
    assert.match(agentEntry.OpenHermes.prompt, /You are OpenHermes, the primary orchestrator/)
    assert.equal(agentEntry.OpenHermes.mode, "primary")
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
