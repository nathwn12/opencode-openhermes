import { describe, it } from "node:test"
import assert from "node:assert/strict"

describe("MemoryTool", () => {
  it("exports MemoryToolPlugin factory", async () => {
    const mod = await import("../lib/memory-tool.mjs")
    assert.equal(typeof mod.MemoryToolPlugin, "function")
  })

  it("returns tool.memory with execute", async () => {
    const { MemoryToolPlugin } = await import("../lib/memory-tool.mjs")
    const plugin = await MemoryToolPlugin()
    assert.ok(plugin.tool?.memory)
    assert.ok(typeof plugin.tool.memory.execute === "function")
    assert.ok(plugin.tool.memory.description)
  })

  it("tool.memory has args schema", async () => {
    const { MemoryToolPlugin } = await import("../lib/memory-tool.mjs")
    const plugin = await MemoryToolPlugin()
    assert.ok(plugin.tool.memory.args)
    assert.ok(plugin.tool.memory.args.action)
    assert.ok(plugin.tool.memory.args.class)
  })
})
