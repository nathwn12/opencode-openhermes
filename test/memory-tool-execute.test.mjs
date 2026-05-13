import { describe, it, before, after } from "node:test"
import assert from "node:assert/strict"
import os from "node:os"
import path from "node:path"
import fs from "node:fs"

const TMP_DB = path.join(os.tmpdir(), `openhermes-test-mtool-${Date.now()}.db`)

describe("MemoryToolPlugin execute paths", () => {
  let plugin, resetStore, getStore

  before(async () => {
    process.env.OPENHERMES_MEMORY_DB = TMP_DB
    resetStore = (await import("../lib/memory-store.mjs")).resetStore
    getStore = (await import("../lib/memory-store.mjs")).getStore
    resetStore()
    getStore(TMP_DB)
    const mod = await import("../lib/memory-tool.mjs")
    plugin = await mod.MemoryToolPlugin()
  })

  after(() => {
    delete process.env.OPENHERMES_MEMORY_DB
    resetStore()
    try { fs.unlinkSync(TMP_DB) } catch {}
  })

  it("save action persists a record", async () => {
    const result = await plugin.tool.memory.execute({
      action: "save",
      class: "decision",
      id: "exec-test-1",
      data: JSON.stringify({ summary: "executed save", scope: "test" }),
    })
    assert.ok(result.includes("saved:"))
    const stored = getStore().get("decision", "exec-test-1")
    assert.ok(stored)
    assert.equal(stored.summary, "executed save")
  })

  it("save action returns error when id or data missing", async () => {
    const noId = await plugin.tool.memory.execute({ action: "save", class: "decision", data: "{}" })
    assert.ok(noId.includes("id and data required"))
    const noData = await plugin.tool.memory.execute({ action: "save", class: "decision", id: "no-data" })
    assert.ok(noData.includes("id and data required"))
  })

  it("save action handles malformed JSON data gracefully", async () => {
    const result = await plugin.tool.memory.execute({
      action: "save",
      class: "decision",
      id: "bad-json",
      data: "not-json",
    })
    assert.ok(result.includes("error") || result.includes("SyntaxError"))
  })

  it("query action returns formatted results", async () => {
    resetStore()
    getStore(TMP_DB)
    getStore().save("decision", "q-test-1", { id: "q-test-1", class: "decision", summary: "query result", updated_at: new Date().toISOString() })

    const plugin2 = await (await import("../lib/memory-tool.mjs")).MemoryToolPlugin()
    const result = await plugin2.tool.memory.execute({
      action: "query",
      class: "decision",
      limit: 5,
    })
    assert.ok(result.includes("q-test-1"))
  })

  it("query action returns 'no records' when empty", async () => {
    resetStore()
    const tmpDb = path.join(os.tmpdir(), `openhermes-test-mtool-empty-${Date.now()}.db`)
    process.env.OPENHERMES_MEMORY_DB = tmpDb
    getStore(tmpDb)

    const mod = await import("../lib/memory-tool.mjs")
    const p = await mod.MemoryToolPlugin()
    const result = await p.tool.memory.execute({ action: "query", class: "mistake", limit: 5 })
    assert.equal(result, "no records")

    delete process.env.OPENHERMES_MEMORY_DB
    resetStore()
    try { fs.unlinkSync(tmpDb) } catch {}
  })

  it("returns error message for unknown action", async () => {
    const result = await plugin.tool.memory.execute({
      action: "unknown",
    })
    assert.ok(result.includes("unknown action"))
  })

  it("describes the tool with args schema", async () => {
    assert.ok(plugin.tool.memory.description)
    assert.ok(plugin.tool.memory.args)
    assert.ok(plugin.tool.memory.args.action)
    assert.ok(plugin.tool.memory.args.class)
  })
})
