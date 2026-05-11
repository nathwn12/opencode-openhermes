import { describe, it } from "node:test"
import assert from "node:assert/strict"

describe("add_memory handles plain text data", () => {
  it("accepts plain text and auto-fills schema defaults", async () => {
    const m = await import("../lib/memory-tools-plugin.mjs")
    const plugin = await m.MemoryToolsPlugin()
    const ctx = { metadata: () => {} }

    const r1 = await plugin.tool.add_memory.execute({ class: "verification_receipt", id: "smoke-plain-text", data: "Fixed the cache script, it works" }, ctx)
    assert.ok(r1.startsWith("saved:") || r1.startsWith("updated:"), `expected saved/updated, got: ${r1}`)

    const r2 = await plugin.tool.add_memory.execute({ class: "verification_receipt", id: "smoke-json-obj", data: JSON.stringify({ summary: "JSON object test", method: "manual-inspection", result: "pass", artifact: "x", artifact_type: "other", fingerprint: { path: "x" } }) }, ctx)
    assert.ok(r2.startsWith("saved:") || r2.startsWith("updated:"), `expected saved/updated, got: ${r2}`)

    const r3 = await plugin.tool.add_memory.execute({ class: "mistake", id: "smoke-plain-mistake", data: "This was a mistake, learned from it" }, ctx)
    assert.ok(r3.startsWith("saved:") || r3.startsWith("updated:"), `expected saved/updated, got: ${r3}`)

    const r4 = await plugin.tool.add_memory.execute({ class: "instinct", id: "smoke-plain-instinct", data: "Always verify before claiming success" }, ctx)
    assert.ok(r4.startsWith("saved:") || r4.startsWith("updated:"), `expected saved/updated, got: ${r4}`)
  })
})
