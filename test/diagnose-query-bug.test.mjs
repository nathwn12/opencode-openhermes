// Regression: memory tool query action uses list() instead of query()
// ensuring results are scoped to the requested class, not cross-class.
import { describe, it, before, after } from "node:test"
import assert from "node:assert/strict"
import os from "node:os"
import path from "node:path"
import fs from "node:fs"

const TMP_DB = path.join(os.tmpdir(), `openhermes-regression-query-${Date.now()}.db`)

describe("MemoryTool query scoped by class", () => {
  let plugin, resetStore, getStore

  before(async () => {
    process.env.OPENHERMES_MEMORY_DB = TMP_DB
    const ms = await import("../lib/memory-store.mjs")
    resetStore = ms.resetStore
    getStore = ms.getStore
    resetStore()
    getStore(TMP_DB)

    // Seed: one record per class
    getStore().save("decision",   "d1", { id: "d1", summary: "decision-only",   class: "decision",   updated_at: new Date().toISOString() })
    getStore().save("checkpoint", "c1", { id: "c1", summary: "checkpoint-only", class: "checkpoint", updated_at: new Date().toISOString() })
    getStore().save("mistake",    "m1", { id: "m1", summary: "mistake-only",    class: "mistake",    updated_at: new Date().toISOString() })

    const mt = await import("../lib/memory-tool.mjs")
    plugin = await mt.MemoryToolPlugin()
  })

  after(() => {
    delete process.env.OPENHERMES_MEMORY_DB
    resetStore()
    try { fs.unlinkSync(TMP_DB) } catch {}
  })

  it("returns only decision records when querying decision class", async () => {
    const result = await plugin.tool.memory.execute({ action: "query", class: "decision", limit: 10 })
    assert.ok(result.includes("decision-only"), "should include decision record")
    assert.ok(!result.includes("checkpoint-only"), "should NOT include checkpoint record")
    assert.ok(!result.includes("mistake-only"), "should NOT include mistake record")
  })

  it("returns only checkpoint records when querying checkpoint class", async () => {
    const result = await plugin.tool.memory.execute({ action: "query", class: "checkpoint", limit: 10 })
    assert.ok(result.includes("checkpoint-only"))
    assert.ok(!result.includes("decision-only"))
    assert.ok(!result.includes("mistake-only"))
  })

  it("returns formatted list or fallback message", async () => {
    const result = await plugin.tool.memory.execute({ action: "query", class: "mistake", limit: 10 })
    assert.ok(result.includes("mistake-only"))
    assert.ok(result.startsWith("- "))
  })
})
