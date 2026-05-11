import { after, describe, it } from "node:test"
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
  })
})

describe("memory tools — latest, list, search, archive, update, lib functions", () => {
  const PREFIX = "d2d4-test-"

  it("ohc_latest — returns most recently saved record", async () => {
    const m = await import("../lib/memory-tools-plugin.mjs")
    const plugin = await m.MemoryToolsPlugin()
    const ctx = { metadata: () => {} }

    await plugin.tool.ohc_save.execute({ class: "instinct", id: `${PREFIX}latest-a`, data: "older" }, ctx)
    await plugin.tool.ohc_save.execute({ class: "instinct", id: `${PREFIX}latest-b`, data: "newer" }, ctx)

    const result = await plugin.tool.ohc_latest.execute({ class: "instinct" }, ctx)
    const obj = JSON.parse(result)
    assert.equal(obj.id, `${PREFIX}latest-b`)
  })

  it("ohc_list — returns multiple records for same class", async () => {
    const m = await import("../lib/memory-tools-plugin.mjs")
    const plugin = await m.MemoryToolsPlugin()
    const ctx = { metadata: () => {} }

    await plugin.tool.ohc_save.execute({ class: "instinct", id: `${PREFIX}list-1`, data: "list test 1" }, ctx)
    await plugin.tool.ohc_save.execute({ class: "instinct", id: `${PREFIX}list-2`, data: "list test 2" }, ctx)
    await plugin.tool.ohc_save.execute({ class: "instinct", id: `${PREFIX}list-3`, data: "list test 3" }, ctx)

    const result = await plugin.tool.ohc_list.execute({ class: "instinct", limit: 10 }, ctx)
    assert.ok(result.includes(`${PREFIX}list-1`))
    assert.ok(result.includes(`${PREFIX}list-2`))
    assert.ok(result.includes(`${PREFIX}list-3`))
  })

  it("ohc_search — finds records by summary text", async () => {
    const m = await import("../lib/memory-tools-plugin.mjs")
    const plugin = await m.MemoryToolsPlugin()
    const ctx = { metadata: () => {} }

    await plugin.tool.ohc_save.execute({ class: "instinct", id: `${PREFIX}search-me`, data: "zzz_unique_search_target_12345" }, ctx)

    const result = await plugin.tool.ohc_search.execute({ query: "zzz_unique_search_target_12345" }, ctx)
    assert.ok(result.includes(`${PREFIX}search-me`))
  })

  it("ohc_archive — archive marks as expired and removes from results", async () => {
    const m = await import("../lib/memory-tools-plugin.mjs")
    const plugin = await m.MemoryToolsPlugin()
    const ctx = { metadata: () => {} }

    await plugin.tool.ohc_save.execute({ class: "instinct", id: `${PREFIX}archive-me`, data: "to be archived" }, ctx)

    const archiveResult = await plugin.tool.ohc_archive.execute({ class: "instinct", id: `${PREFIX}archive-me` }, ctx)
    assert.ok(archiveResult.startsWith("archived:"))

    const latest = await plugin.tool.ohc_latest.execute({ class: "instinct" }, ctx)
    assert.ok(!latest.includes(`${PREFIX}archive-me`) || latest === "no active records")
  })

  it("ohc_save update — saving same ID twice returns 'updated:'", async () => {
    const m = await import("../lib/memory-tools-plugin.mjs")
    const plugin = await m.MemoryToolsPlugin()
    const ctx = { metadata: () => {} }

    const first = await plugin.tool.ohc_save.execute({ class: "instinct", id: `${PREFIX}update-check`, data: "first version" }, ctx)
    assert.ok(first.startsWith("saved:"))

    const second = await plugin.tool.ohc_save.execute({ class: "instinct", id: `${PREFIX}update-check`, data: "second version" }, ctx)
    assert.ok(second.startsWith("updated:"))

    const fetchResult = await plugin.tool.ohc_get.execute({ class: "instinct", id: `${PREFIX}update-check` }, ctx)
    const obj = JSON.parse(fetchResult)
    assert.ok(obj.summary?.includes("second version"))
  })

  it("isTruthy from hardening.mjs", async () => {
    const { isTruthy } = await import("../lib/hardening.mjs")

    assert.equal(isTruthy("1"), true)
    assert.equal(isTruthy("true"), true)
    assert.equal(isTruthy("yes"), true)
    assert.equal(isTruthy("on"), true)
    assert.equal(isTruthy("0"), false)
    assert.equal(isTruthy(""), false)
    assert.equal(isTruthy(undefined), false)
    assert.equal(isTruthy("false"), false)
  })

  it("isPlainObject from hardening.mjs", async () => {
    const { isPlainObject } = await import("../lib/hardening.mjs")

    assert.equal(isPlainObject({}), true)
    assert.equal(isPlainObject({ a: 1 }), true)
    assert.equal(isPlainObject(null), false)
    assert.equal(isPlainObject(undefined), false)
    assert.equal(isPlainObject([]), false)
    assert.equal(isPlainObject("string"), false)
    assert.equal(isPlainObject(42), false)
    assert.equal(isPlainObject(true), false)
  })

  it("fillSchemaDefaults fills checkpoint required fields", async () => {
    const m = await import("../lib/memory-tools-plugin.mjs")
    const plugin = await m.MemoryToolsPlugin()
    const ctx = { metadata: () => {} }

    await plugin.tool.ohc_save.execute({ class: "checkpoint", id: `${PREFIX}fill-check`, data: "test the system" }, ctx)
    const result = await plugin.tool.ohc_get.execute({ class: "checkpoint", id: `${PREFIX}fill-check` }, ctx)
    const obj = JSON.parse(result)

    assert.ok(typeof obj.mission === "string", "mission should be filled")
    assert.ok(typeof obj.current_state === "string", "current_state should be filled")
    assert.ok(Array.isArray(obj.next_actions), "next_actions should be an array")
    assert.ok(obj.provenance?.session_id, "provenance.session_id should be filled")
  })

  after(async () => {
    const m = await import("../lib/memory-tools-plugin.mjs")
    const plugin = await m.MemoryToolsPlugin()
    const ctx = { metadata: () => {} }

    const instinctIds = ["latest-a", "latest-b", "list-1", "list-2", "list-3", "search-me", "archive-me", "update-check"]
    for (const id of instinctIds) {
      await plugin.tool.ohc_archive.execute({ class: "instinct", id: `${PREFIX}${id}` }, ctx).catch(() => {})
    }
    await plugin.tool.ohc_archive.execute({ class: "checkpoint", id: `${PREFIX}fill-check` }, ctx).catch(() => {})
  })
})
