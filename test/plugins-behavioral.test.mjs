import { describe, it, before } from "node:test"
import assert from "node:assert/strict"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))

describe("BootstrapPlugin behavior", () => {
  let mod

  before(async () => {
    mod = await import("../bootstrap.mjs")
  })

  it("registers package-local skills, commands, agents, and instructions", async () => {
    const plugin = await mod.BootstrapPlugin({ directory: __dirname })
    const config = { skills: { paths: [] }, command: {}, agent: {}, instructions: [] }

    await plugin.config(config)

    assert.ok(config.skills.paths.some(p => p.endsWith(path.join("harness", "skills"))))
    assert.ok(config.command["oh-doctor"])
    assert.ok(config.agent.OpenHermes)
    assert.equal(config.default_agent, "OpenHermes")
    assert.ok(config.instructions.some(p => p.endsWith(path.join("harness", "codex", "CONSTITUTION.md"))))
    assert.ok(config.instructions.some(p => p.endsWith(path.join("harness", "instructions", "RUNTIME.md"))))
  })

  it("loads markdown manifests into command and agent config", async () => {
    const plugin = await mod.BootstrapPlugin({ directory: __dirname })
    const config = { skills: { paths: [] }, command: {}, agent: {}, instructions: [] }

    await plugin.config(config)

    assert.match(config.command["oh-doctor"].template, /Inspect the current OpenHermes\/OpenCode setup/)
    assert.equal(config.command["oh-doctor"].agent, "OpenHermes")
    assert.match(config.agent.OpenHermes.prompt, /You are OpenHermes, the primary orchestrator/)
    assert.equal(config.agent.OpenHermes.mode, "primary")
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

    assert.match(output.messages[0].parts[0].text, /OPENHERMES_BOOTSTRAP/)
    assert.match(output.messages[0].parts[1].text, /actual user request/)
    assert.equal(
      output.messages[0].parts.filter(part => typeof part.text === "string" && part.text.includes("OPENHERMES_BOOTSTRAP")).length,
      1,
    )
  })
})
