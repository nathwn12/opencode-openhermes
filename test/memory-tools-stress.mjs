import { describe, it } from "node:test"
import assert from "node:assert/strict"

describe("ohc_save — all classes accept plain text data", () => {
  const CLASSES = ["audit", "checkpoint", "mistake", "instinct", "decision", "constraint", "backlog", "verification_receipt"]

  it("every class saves with plain text data", async () => {
    const m = await import("../lib/memory-tools-plugin.mjs")
    const plugin = await m.MemoryToolsPlugin()
    const ctx = { metadata: () => {} }

    for (const cls of CLASSES) {
      const id = `stress-plain-${cls}`
      const r = await plugin.tool.ohc_save.execute({ class: cls, id, data: `Plain text test for ${cls}` }, ctx)
      assert.ok(r.startsWith("saved:") || r.startsWith("updated:"), `${cls}: expected saved/updated, got "${r}"`)

      const fetchResult = await plugin.tool.ohc_get.execute({ class: cls, id }, ctx)
      const obj = JSON.parse(fetchResult)
      assert.equal(obj.class, cls, `${cls}: class mismatch in stored record`)
      assert.ok(obj.summary?.includes(cls), `${cls}: summary should include class name`)
    }
  })

  it("handles null data", async () => {
    const m = await import("../lib/memory-tools-plugin.mjs")
    const plugin = await m.MemoryToolsPlugin()
    const ctx = { metadata: () => {} }

    const r = await plugin.tool.ohc_save.execute({ class: "instinct", id: "stress-null-data", data: null }, ctx)
    assert.ok(r.startsWith("saved:") || r.startsWith("updated:"), `null data: got "${r}"`)
  })

  it("handles number data", async () => {
    const m = await import("../lib/memory-tools-plugin.mjs")
    const plugin = await m.MemoryToolsPlugin()
    const ctx = { metadata: () => {} }

    const r = await plugin.tool.ohc_save.execute({ class: "instinct", id: "stress-number-data", data: 42 }, ctx)
    assert.ok(r.startsWith("saved:") || r.startsWith("updated:"), `number data: got "${r}"`)
  })

  it("sanitizes malicious ids", async () => {
    const m = await import("../lib/memory-tools-plugin.mjs")
    const plugin = await m.MemoryToolsPlugin()
    const ctx = { metadata: () => {} }

    const badId = "../../etc/passwd"
    const r = await plugin.tool.ohc_save.execute({ class: "instinct", id: badId, data: "traversal attempt" }, ctx)
    assert.ok(r.startsWith("saved:") || r.startsWith("updated:"), `bad id: got "${r}"`)
    // id should be sanitized — dots and slashes replaced
    const sanitizedId = badId.replace(/[<>:"/\\|?*]/g, "_").replace(/\.\./g, "_").trim()
    const fetchResult = await plugin.tool.ohc_get.execute({ class: "instinct", id: sanitizedId }, ctx)
    assert.ok(JSON.parse(fetchResult).id === sanitizedId, "stored id should be sanitized")
  })

  it("returns error for blank id", async () => {
    const m = await import("../lib/memory-tools-plugin.mjs")
    const plugin = await m.MemoryToolsPlugin()
    const ctx = { metadata: () => {} }

    const r = await plugin.tool.ohc_save.execute({ class: "instinct", id: "", data: "no id" }, ctx)
    assert.ok(r.includes("non-blank id"), `expected blank-id error, got "${r}"`)
  })

  it("deep-auto-fills audit's nested required fields", async () => {
    const m = await import("../lib/memory-tools-plugin.mjs")
    const plugin = await m.MemoryToolsPlugin()
    const ctx = { metadata: () => {} }

    const r = await plugin.tool.ohc_save.execute({ class: "audit", id: "stress-audit-deep", data: "deep fill audit" }, ctx)
    assert.ok(r.startsWith("saved:") || r.startsWith("updated:"), `audit deep: got "${r}"`)
    const obj = JSON.parse(await plugin.tool.ohc_get.execute({ class: "audit", id: "stress-audit-deep" }, ctx))
    assert.ok(obj.provenance?.session_id, "provenance.session_id should be filled")
    assert.ok(Array.isArray(obj.checks), "checks should be an array")
    assert.ok(typeof obj.integrity?.refs_ok === "boolean", "integrity.refs_ok should be filled")
  })
})
