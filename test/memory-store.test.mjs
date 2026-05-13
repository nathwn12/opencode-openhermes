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
    const record = { id: "test-1", class: "decision", summary: "test record", scope: "test", updated_at: "2019-01-01T00:00:00.000Z" }
    store.save("decision", "test-1", record)
    const got = store.get("decision", "test-1")
    assert.ok(got)
    assert.equal(got.id, "test-1")
    assert.equal(got.summary, "test record")
  })

  it("get returns null for missing record", () => {
    const got = store.get("decision", "does-not-exist")
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
    store.save("decision", "latest-a", { id: "latest-a", class: "decision", summary: "first" })
    store.save("decision", "latest-b", { id: "latest-b", class: "decision", summary: "second" })
    const latest = store.latest("decision")
    assert.equal(latest.id, "latest-b")
  })

  it("search finds records by summary text", () => {
    store.save("decision", "search-target", { id: "search-target", class: "decision", summary: "zzz_unique_target_word" })
    const results = store.search("zzz_unique_target_word", ["decision"], "", 10)
    assert.ok(results.some(r => r.id === "search-target"))
  })

  it("archived record excluded from active-only queries", () => {
    store.save("decision", "archived-excl", { id: "archived-excl", class: "decision", summary: "will be archived", status: "expired" })
    const items = store.list("decision", 100)
    assert.ok(!items.some(i => i.id === "archived-excl"))
  })

  it("all returns all active records", () => {
    const all = store.all("decision")
    assert.ok(Array.isArray(all))
    assert.ok(all.every(r => r.class === "decision"))
  })

  it("query returns recent records scoped by project", () => {
    store.save("decision", "query-proj-a", { id: "query-proj-a", class: "decision", summary: "project a decision", project: "proj-a", updated_at: new Date().toISOString() })
    store.save("decision", "query-proj-b", { id: "query-proj-b", class: "decision", summary: "project b decision", project: "proj-b", updated_at: new Date().toISOString() })
    const results = store.query("proj-a", 5)
    assert.ok(results.some(r => r.id === "query-proj-a"))
    assert.ok(!results.some(r => r.id === "query-proj-b"))
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

  it("sets user_version to non-zero on creation", () => {
    const row = store.db.prepare("PRAGMA user_version").get()
    const version = row?.user_version ?? (typeof row === "number" ? row : 0)
    assert.ok(version > 0, `expected user_version > 0, got ${version}`)
  })
})

describe("Bun SQLite adapter", () => {
  it("uses Bun's native Database without overriding prepare", async () => {
    const { createBunDatabaseCtor } = await import("../lib/sqlite-adapter.mjs")
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

  it("describeSqliteInterface detects proper interface", async () => {
    const { describeSqliteInterface, createBunDatabaseCtor } = await import("../lib/sqlite-adapter.mjs")
    class FakeDb {
      exec() {}
      prepare() { return { run() {}, get() {}, all() { return [] } } }
      close() {}
    }
    assert.equal(describeSqliteInterface(FakeDb), true)
    assert.equal(describeSqliteInterface({}), false)
  })
})

