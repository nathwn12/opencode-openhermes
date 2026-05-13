import { describe, it } from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"

describe("plugin exports", () => {
  it("index.mjs default exports merged plugin", async () => {
    const pkg = await import("../index.mjs")
    assert.ok(typeof pkg.default === "function")
  })

  it("autorecall.mjs exports AutorecallPlugin", async () => {
    const mod = await import("../autorecall.mjs")
    assert.ok(typeof mod.AutorecallPlugin === "function")
  })

  it("curator.mjs exports CuratorPlugin", async () => {
    const mod = await import("../curator.mjs")
    assert.ok(typeof mod.CuratorPlugin === "function")
  })

  it("bootstrap.mjs exports BootstrapPlugin", async () => {
    const mod = await import("../bootstrap.mjs")
    assert.ok(typeof mod.BootstrapPlugin === "function")
  })

  it("lib/ambient-memory.mjs exports AmbientMemoryPlugin", async () => {
    const mod = await import("../lib/ambient-memory.mjs")
    assert.ok(typeof mod.AmbientMemoryPlugin === "function")
  })

  it("lib/memory-tool.mjs exports MemoryToolPlugin", async () => {
    const mod = await import("../lib/memory-tool.mjs")
    assert.ok(typeof mod.MemoryToolPlugin === "function")
  })
})

describe("plugin structure", () => {
  it("AutorecallPlugin returns event hook", async () => {
    const plugin = await AutorecallPlugin({ project: {}, directory: process.cwd() })
    assert.ok(typeof plugin.event === "function")
  })

  it("CuratorPlugin returns event + experimental.session.compacting hooks", async () => {
    const plugin = await CuratorPlugin({ project: {}, directory: process.cwd() })
    assert.ok(typeof plugin.event === "function")
    assert.ok(typeof plugin["experimental.session.compacting"] === "function")
  })

  it("BootstrapPlugin returns config + chat.transform hooks", async () => {
    const plugin = await BootstrapPlugin({ client: {}, directory: process.cwd() })
    assert.ok(typeof plugin.config === "function")
    assert.ok(typeof plugin["experimental.chat.messages.transform"] === "function")
  })

  it("AmbientMemoryPlugin returns chat.transform hook", async () => {
    const plugin = await AmbientMemoryPlugin()
    assert.ok(typeof plugin["experimental.chat.messages.transform"] === "function")
  })

  it("MemoryToolPlugin returns tool.memory with execute", async () => {
    const plugin = await MemoryToolPlugin()
    assert.ok(plugin.tool?.memory)
    assert.ok(typeof plugin.tool.memory.execute === "function")
  })

  it("bootstrap.mjs re-exports resolveHarnessRoot", async () => {
    const { resolveHarnessRoot, setHarnessRootForTest, getHarnessDir } = await import("../bootstrap.mjs")
    assert.ok(typeof resolveHarnessRoot === "function")
    assert.ok(typeof setHarnessRootForTest === "function")
    assert.ok(typeof getHarnessDir === "function")
  })

  it("resolveHarnessRoot picks complete harness root", async () => {
    const { resolveHarnessRoot } = await import("../bootstrap.mjs")
    const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "openhermes-harness-"))
    const badRoot = path.join(tmpRoot, "bad")
    const goodRoot = path.join(tmpRoot, "good")

    fs.mkdirSync(path.join(badRoot, "codex"), { recursive: true })
    fs.writeFileSync(path.join(badRoot, "codex", "CONSTITUTION.md"), "# incomplete\n")

    const requiredFiles = [
      ["codex", "CONSTITUTION.md"],
      ["instructions", "RUNTIME.md"],
      ["skills", "oh-plan", "SKILL.md"],
    ]

    for (const parts of requiredFiles) {
      const filePath = path.join(goodRoot, ...parts)
      fs.mkdirSync(path.dirname(filePath), { recursive: true })
      fs.writeFileSync(filePath, "ok\n")
    }

    const resolved = resolveHarnessRoot({ candidateRoots: [badRoot, goodRoot] })
    assert.equal(resolved, goodRoot)
  })

  it("setHarnessRootForTest overrides harness resolution", async () => {
    const { setHarnessRootForTest, getHarnessDir } = await import("../bootstrap.mjs")
    setHarnessRootForTest("/custom/harness")
    assert.equal(getHarnessDir(), "/custom/harness")
    setHarnessRootForTest(undefined)
  })
})

async function AutorecallPlugin(ctx) {
  const mod = await import("../autorecall.mjs")
  return mod.AutorecallPlugin(ctx)
}
async function CuratorPlugin(ctx) {
  const mod = await import("../curator.mjs")
  return mod.CuratorPlugin(ctx)
}
async function BootstrapPlugin(ctx) {
  const mod = await import("../bootstrap.mjs")
  return mod.BootstrapPlugin(ctx)
}
async function AmbientMemoryPlugin() {
  const mod = await import("../lib/ambient-memory.mjs")
  return mod.AmbientMemoryPlugin()
}
async function MemoryToolPlugin() {
  const mod = await import("../lib/memory-tool.mjs")
  return mod.MemoryToolPlugin()
}
