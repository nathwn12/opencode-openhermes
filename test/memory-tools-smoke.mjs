import { after, before, describe, it } from "node:test"
import assert from "node:assert/strict"

describe("ohc_save handles plain text data", () => {
  let plugin, ctx

  before(async () => {
    const m = await import("../lib/memory-tools-plugin.mjs")
    plugin = await m.MemoryToolsPlugin()
    ctx = {}
  })

  it("saves plain text to verification_receipt class", async () => {
    const r = await plugin.tool.ohc_save.execute({ class: "verification_receipt", id: "smoke-plain-text", data: "Fixed the cache script, it works" }, ctx)
    assert.ok(r.startsWith("saved:") || r.startsWith("updated:"), `expected saved/updated, got: ${r}`)
  })

  it("saves JSON object data to verification_receipt class", async () => {
    const r = await plugin.tool.ohc_save.execute({ class: "verification_receipt", id: "smoke-json-obj", data: JSON.stringify({ summary: "JSON object test", method: "manual-inspection", result: "pass", artifact: "x", artifact_type: "other", fingerprint: { path: "x" } }) }, ctx)
    assert.ok(r.startsWith("saved:") || r.startsWith("updated:"), `expected saved/updated, got: ${r}`)
  })

  it("saves plain text to mistake class", async () => {
    const r = await plugin.tool.ohc_save.execute({ class: "mistake", id: "smoke-plain-mistake", data: "This was a mistake, learned from it" }, ctx)
    assert.ok(r.startsWith("saved:") || r.startsWith("updated:"), `expected saved/updated, got: ${r}`)
  })

  it("saves plain text to instinct class", async () => {
    const r = await plugin.tool.ohc_save.execute({ class: "instinct", id: "smoke-plain-instinct", data: "Always verify before claiming success" }, ctx)
    assert.ok(r.startsWith("saved:") || r.startsWith("updated:"), `expected saved/updated, got: ${r}`)
  })

  after(async () => {
    const records = [
      { class: "verification_receipt", id: "smoke-plain-text" },
      { class: "verification_receipt", id: "smoke-json-obj" },
      { class: "mistake", id: "smoke-plain-mistake" },
      { class: "instinct", id: "smoke-plain-instinct" },
    ]
    for (const { class: cls, id } of records) {
      await plugin.tool.ohc_archive.execute({ class: cls, id }, ctx).catch(() => {})
    }
  })
})
