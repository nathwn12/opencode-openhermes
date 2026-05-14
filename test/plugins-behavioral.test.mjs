import { describe, it, before, after } from "node:test"
import assert from "node:assert/strict"
import os from "node:os"
import path from "node:path"
import fs from "node:fs"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const CURATOR_DB = path.join(os.tmpdir(), `openhermes-test-curator-${Date.now()}.db`)

describe("CuratorPlugin behavior", () => {
  let mod, resetStore, getStore

  before(async () => {
    process.env.OPENHERMES_MEMORY_DB = CURATOR_DB
    resetStore = (await import("../lib/memory-store.mjs")).resetStore
    getStore = (await import("../lib/memory-store.mjs")).getStore
    resetStore()
    mod = await import("../curator.mjs")
  })

  after(() => {
    delete process.env.OPENHERMES_MEMORY_DB
    resetStore()
    try { fs.unlinkSync(CURATOR_DB) } catch {}
  })

  it("compaction hook saves checkpoint and injects context", async () => {
    resetStore()
    getStore(CURATOR_DB)
    const plugin = await mod.CuratorPlugin({ project: { name: "chk-proj" }, directory: "/tmp" })
    const output = { context: [] }
    await plugin["experimental.session.compacting"]({}, output)
    const latest = getStore().latest("checkpoint")
    assert.ok(latest)
    assert.ok(latest.summary.includes("chk-proj"))
    assert.ok(output.context.some(c => c.includes("chk-proj")))
  })

  it("compacting hook injects context with checkpoint info", async () => {
    resetStore()
    getStore(CURATOR_DB)
    const plugin = await mod.CuratorPlugin({ project: { name: "ctx-proj" }, directory: "/tmp" })
    const output = { context: ["existing"] }
    await plugin["experimental.session.compacting"](
      { project: { name: "ctx-proj" }, directory: "/tmp" },
      output
    )
    assert.ok(Array.isArray(output.context))
    assert.ok(output.context.length >= 2)
    assert.ok(output.context.some(c => typeof c === "string" && c.includes("OpenHermes State")))
    assert.ok(output.context.some(c => c.includes("ctx-proj")))
  })

  it("compacting hook creates context array when missing", async () => {
    resetStore()
    getStore(CURATOR_DB)
    const plugin = await mod.CuratorPlugin({ project: {}, directory: "/tmp" })
    const output = {}
    await plugin["experimental.session.compacting"]({ project: {}, directory: "/tmp" }, output)
    assert.ok(Array.isArray(output.context))
  })

  it("handles errors gracefully without throwing", async () => {
    const plugin = await mod.CuratorPlugin({ project: {}, directory: "/tmp" })
    await plugin.event({ event: { type: null } })
    await plugin["experimental.session.compacting"]({ project: {}, directory: "/tmp" }, {})
  })
})

describe("AutorecallPlugin behavior", () => {
  let mod, resetStore, getStore

  const AUTORECALL_DB = path.join(os.tmpdir(), `openhermes-test-autorecall-${Date.now()}.db`)

  before(async () => {
    process.env.OPENHERMES_MEMORY_DB = AUTORECALL_DB
    process.env.OPENCODE_ALLOW_PROJECT_HARNESS = "false"
    resetStore = (await import("../lib/memory-store.mjs")).resetStore
    getStore = (await import("../lib/memory-store.mjs")).getStore
    resetStore()
    mod = await import("../autorecall.mjs")
  })

  after(() => {
    delete process.env.OPENHERMES_MEMORY_DB
    delete process.env.OPENCODE_ALLOW_PROJECT_HARNESS
    resetStore()
    try { fs.unlinkSync(AUTORECALL_DB) } catch {}
  })

  it("event handler writes cache.json on session.created", async () => {
    resetStore()
    const store = getStore(AUTORECALL_DB)
    store.save("decision", "recall-dec-1", { id: "recall-dec-1", class: "decision", summary: "test decision", updated_at: new Date().toISOString() })

    const plugin = await mod.AutorecallPlugin({ project: { name: "recall-proj" }, directory: "/tmp" })
    await plugin.event({ event: { type: "session.created" } })

    const cacheDir = path.join(os.homedir(), ".cache", "opencode", "openhermes", "recall")
    const cachePath = path.join(cacheDir, "cache.json")
    assert.ok(fs.existsSync(cachePath))

    const cached = JSON.parse(fs.readFileSync(cachePath, "utf8"))
    assert.equal(cached.project, "recall-proj")
    assert.ok(cached.updated_at)
    try { fs.unlinkSync(cachePath) } catch {}
  })

  it("skips non-session.created events", async () => {
    const plugin = await mod.AutorecallPlugin({ project: { name: "skip-proj" }, directory: "/tmp" })
    await plugin.event({ event: { type: "message.created" } })
  })

  it("handles missing project gracefully", async () => {
    const plugin = await mod.AutorecallPlugin({ project: {}, directory: os.tmpdir() })
    await plugin.event({ event: { type: "session.created" } })
  })
})

describe("BootstrapPlugin config hook", () => {
  let mod

  before(async () => {
    mod = await import("../bootstrap.mjs")
  })

  it("config hook adds skills path", async () => {
    process.env.OPENCODE_ALLOW_PROJECT_HARNESS = "false"
    const plugin = await mod.BootstrapPlugin({ directory: __dirname })
    const config = { skills: { paths: [] } }
    await plugin.config(config)
    assert.ok(config.skills.paths.length > 0)
    const skillsDir = config.skills.paths[0]
    assert.ok(skillsDir.endsWith("skills"))
  })

  it("config hook registers OpenHermes as the default primary agent", async () => {
    process.env.OPENCODE_ALLOW_PROJECT_HARNESS = "false"
    const plugin = await mod.BootstrapPlugin({ directory: __dirname })
    const config = { agent: {} }
    await plugin.config(config)
    assert.equal(config.default_agent, "OpenHermes")
    assert.ok(config.agent.OpenHermes)
    assert.equal(config.agent.OpenHermes.mode, "primary")
    assert.equal(config.agent.OpenHermes.permission.edit, "allow")
    assert.equal(config.agent.OpenHermes.permission.read, "allow")
    assert.equal(config.agent.OpenHermes.permission.bash["*"], "allow")
  })
})

describe("AmbientMemoryPlugin structure", () => {
  let mod

  before(async () => {
    mod = await import("../lib/ambient-memory.mjs")
  })

  it("returns chat.transform hook", async () => {
    const plugin = await mod.AmbientMemoryPlugin()
    assert.ok(typeof plugin["experimental.chat.messages.transform"] === "function")
  })

  it("transform handles empty output gracefully", async () => {
    const plugin = await mod.AmbientMemoryPlugin()
    await plugin["experimental.chat.messages.transform"]({}, { messages: [] })
    await plugin["experimental.chat.messages.transform"]({}, {})
  })

  it("injects memory into the user text part instead of the bootstrap part", async () => {
    const plugin = await mod.AmbientMemoryPlugin()
    const output = {
      messages: [
        {
          info: { role: "user" },
          parts: [
            { type: "text", text: "<OPENHERMES_V4>\nboot" },
            { type: "text", text: "actual user request" },
          ],
        },
      ],
    }

    await plugin["experimental.chat.messages.transform"]({}, output)

    assert.match(output.messages[0].parts[0].text, /OPENHERMES_V4/)
    assert.doesNotMatch(output.messages[0].parts[0].text, /OPENHERMES_MEMORY/)
    assert.match(output.messages[0].parts[1].text, /OPENHERMES_MEMORY/)
    assert.match(output.messages[0].parts[1].text, /actual user request/)
  })
})
