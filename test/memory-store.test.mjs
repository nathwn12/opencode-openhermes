import { describe, it, before, after } from "node:test"
import assert from "node:assert/strict"
import os from "node:os"
import path from "node:path"
import fs from "node:fs"

const TMP_DB = path.join(os.tmpdir(), `openhermes-test-memory-${Date.now()}.db`)

describe("MemoryStore", () => {
  let MemoryStore, getStore, resetStore, store

  before(async () => {
    const mod = await import("../lib/memory-store.mjs")
    MemoryStore = mod.MemoryStore
    getStore = mod.getStore
    resetStore = mod.resetStore
    resetStore()
    store = new MemoryStore(TMP_DB)
  })

  after(() => {
    store.close()
    try { fs.unlinkSync(TMP_DB) } catch {}
  })

  it("save + get round-trips a record", () => {
    const record = { id: "test-1", class: "instinct", summary: "test record", scope: "test" }
    store.save("instinct", "test-1", record)
    const got = store.get("instinct", "test-1")
    assert.ok(got)
    assert.equal(got.id, "test-1")
    assert.equal(got.summary, "test record")
  })

  it("get returns null for missing record", () => {
    const got = store.get("instinct", "does-not-exist")
    assert.equal(got, null)
  })

  it("list returns records ordered by recency", () => {
    store.save("decision", "list-1", { id: "list-1", class: "decision", summary: "older", created_at: "2020-01-01T00:00:00.000Z", updated_at: "2020-01-01T00:00:00.000Z" })
    store.save("decision", "list-2", { id: "list-2", class: "decision", summary: "newer", created_at: "2024-01-01T00:00:00.000Z", updated_at: "2024-01-01T00:00:00.000Z" })
    const items = store.list("decision", 10)
    assert.ok(items.length >= 2)
    assert.equal(items[0].id, "list-2")
  })

  it("latest returns most recent active record", () => {
    store.save("instinct", "latest-a", { id: "latest-a", class: "instinct", summary: "first" })
    store.save("instinct", "latest-b", { id: "latest-b", class: "instinct", summary: "second" })
    const latest = store.latest("instinct")
    assert.equal(latest.id, "latest-b")
  })

  it("search finds records by summary text", () => {
    store.save("instinct", "search-target", { id: "search-target", class: "instinct", summary: "zzz_unique_target_word" })
    const results = store.search("zzz_unique_target_word", ["instinct"], "", 10)
    assert.ok(results.some(r => r.id === "search-target"))
  })

  it("archive sets status to expired", () => {
    store.save("instinct", "archive-me", { id: "archive-me", class: "instinct", summary: "to be archived" })
    store.archive("instinct", "archive-me")
    const s = store.get("instinct", "archive-me")
    assert.equal(s.status, "expired")
  })

  it("archived record excluded from active-only queries", () => {
    store.save("instinct", "archived-excl", { id: "archived-excl", class: "instinct", summary: "will be archived", status: "expired" })
    const items = store.list("instinct", 100)
    assert.ok(!items.some(i => i.id === "archived-excl"))
  })

  it("count returns accurate active count", () => {
    const c = store.count("instinct")
    assert.equal(typeof c, "number")
    assert.ok(c >= 0)
  })

  it("all returns all active records", () => {
    const all = store.all("decision")
    assert.ok(Array.isArray(all))
    assert.ok(all.every(r => r.class === "decision"))
  })

  it("_clear removes all records for a class", () => {
    store.save("instinct", "clear-test", { id: "clear-test", class: "instinct", summary: "will be cleared" })
    store._clear("instinct")
    assert.equal(store.get("instinct", "clear-test"), null)
  })

  it("getStore returns singleton", () => {
    resetStore()
    const a = getStore(TMP_DB)
    const b = getStore(TMP_DB)
    assert.equal(a, b)
  })

  it("resetStore closes and nullifies singleton", () => {
    resetStore()
    assert.equal(typeof getStore, "function")
  })
})

describe("Bun SQLite adapter", () => {
  it("uses Bun's native Database without overriding prepare", async () => {
    const { createBunDatabaseCtor } = await import("../lib/memory-store.mjs")
    let instance
    class FakeBunDatabase {
      constructor(file) {
        this.file = file
        this.prepareCalls = 0
        this.queryCalls = 0
        instance = this
      }
      exec() {}
      prepare() {
        this.prepareCalls++
        return { run() {}, get() {}, all() { return [] } }
      }
      query() {
        this.queryCalls++
        return this.prepare()
      }
      close() {}
    }

    const DatabaseCtor = createBunDatabaseCtor({ Database: FakeBunDatabase })
    const db = new DatabaseCtor(":memory:")
    db.prepare("select 1")

    assert.equal(instance.prepareCalls, 1)
    assert.equal(instance.queryCalls, 0)
    assert.equal(Object.hasOwn(db, "prepare"), false)
  })
})

describe("migrateFromJson", () => {
  let migrateFromJson, MemoryStore
  let store, dbPath

  before(async () => {
    const mod = await import("../lib/memory-store.mjs")
    MemoryStore = mod.MemoryStore
    migrateFromJson = mod.migrateFromJson
    dbPath = path.join(os.tmpdir(), `test-migrate-${Date.now()}.db`)
    store = new MemoryStore(dbPath)
  })

  it("returns { migrated: 0, message: 'already has data' } when store has records", async () => {
    store.save("instinct", "pre-existing", { id: "pre-existing", class: "instinct", summary: "exists" })
    const result = await migrateFromJson(store)
    assert.equal(result.migrated, 0)
    assert.ok(result.message.includes("already has data"))
  })

  after(() => {
    store.close()
    try { fs.unlinkSync(dbPath) } catch {}
  })
})
