// Bun smoke test for MemoryStore — runs under `bun scripts/smoke-memory-store.mjs`
// Must fail if the old `db.prepare = (sql) => db.query(sql)` monkey-patch is present.

import { unlinkSync } from "node:fs"
import { join } from "node:path"
import { tmpdir } from "node:os"

const dbPath = join(tmpdir(), `openhermes-bun-smoke-${Date.now()}.db`)

let exitCode = 0
function assert(condition, msg) {
  if (!condition) {
    console.error(`FAIL: ${msg}`)
    exitCode = 1
  } else {
    console.log(`  PASS: ${msg}`)
  }
}

async function main() {
  console.log("Bun smoke test: MemoryStore")

  // 1. Import MemoryStore
  const { MemoryStore, resetStore } = await import("../lib/memory-store.mjs")
  resetStore()
  const store = new MemoryStore(dbPath)

  // 2. Save a record
  const record = { id: "bun-smoke-1", class: "instinct", summary: "bun smoke test record", scope: "test", extra_field: "hello bun" }
  store.save("instinct", "bun-smoke-1", record)
  console.log("  save: OK")

  // 3. Get the record
  const got = store.get("instinct", "bun-smoke-1")
  assert(got !== null, "get returns record")
  assert(got.id === "bun-smoke-1", "id preserved")
  assert(got.summary === "bun smoke test record", "summary preserved")
  assert(got.extra_field === "hello bun", "payload fields preserved")

  // 4. List includes the record
  const items = store.list("instinct", 10)
  assert(items.some(i => i.id === "bun-smoke-1"), "list includes record")

  // 5. Search finds by summary
  const results = store.search("bun smoke test record", ["instinct"], "", 10)
  assert(results.some(r => r.id === "bun-smoke-1"), "search finds record by summary")

  // 6. Archive changes status
  store.archive("instinct", "bun-smoke-1")
  const archived = store.get("instinct", "bun-smoke-1")
  assert(archived.status === "expired", "archive sets status to expired")

  // 7. Archived record excluded from active list
  const activeItems = store.list("instinct", 100)
  assert(!activeItems.some(i => i.id === "bun-smoke-1"), "archived record excluded from active list")

  // 8. Count is correct
  const count = store.count("instinct")
  assert(typeof count === "number" && count >= 0, "count returns non-negative number")

  // 9. Close store
  store.close()

  console.log(`\nResult: ${exitCode === 0 ? "ALL PASS" : "SOME FAILED"}`)
  process.exit(exitCode)
}

main().catch(err => {
  console.error("Bun smoke test crash:", err)
  process.exit(1)
}).finally(() => {
  try { unlinkSync(dbPath) } catch {}
})
