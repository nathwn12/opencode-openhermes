import { createRequire } from "node:module"
import path from "node:path"
import os from "node:os"
import fs from "node:fs"
import { getMemoryDbPath, getMemoryRoot } from "./paths.mjs"
import { readJson, readJsonl } from "./hardening.mjs"

const _require = createRequire(import.meta.url)

let DatabaseCtor = null
try {
  const mod = _require("node:sqlite")
  DatabaseCtor = mod.DatabaseSync
} catch {
  try {
    const mod = _require("bun:sqlite")
    DatabaseCtor = function BunDatabaseWrapper(file) {
      const db = new mod.Database(file)
      db.prepare = (sql) => db.query(sql)
      return db
    }
  } catch {}
}

if (!DatabaseCtor) {
  throw new Error(
    "No SQLite driver available. OpenHermes requires either Node.js 22+ (node:sqlite) or Bun (bun:sqlite)."
  )
}

const ALL_CLASSES = ["audit", "backlog", "checkpoint", "constraint", "decision", "instinct", "mistake", "verification_receipt"]

let _store = null

export class MemoryStore {
  constructor(dbPath) {
    this.db = new DatabaseCtor(dbPath)
    this.db.exec("PRAGMA journal_mode=WAL")
    this.db.exec("PRAGMA synchronous=NORMAL")
    this.db.exec("PRAGMA busy_timeout=5000")
    this._migrate()
  }

  _migrate() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS memory_records (
        id TEXT NOT NULL,
        class TEXT NOT NULL,
        data TEXT NOT NULL,
        summary TEXT,
        status TEXT NOT NULL DEFAULT 'active',
        scope TEXT,
        project TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        session_id TEXT,
        PRIMARY KEY (class, id)
      )
    `)
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_mr_class_status ON memory_records(class, status)
    `)
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_mr_updated ON memory_records(class, updated_at DESC)
    `)
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_mr_summary ON memory_records(summary)
    `)
  }

  save(cls, id, record) {
    const dataStr = JSON.stringify(record)
    const summary = record.summary || null
    const status = record.status || "active"
    const scope = record.scope || null
    const project = record.project || null
    const created_at = record.created_at || new Date().toISOString()
    const updated_at = record.updated_at || new Date().toISOString()
    const session_id = record.provenance?.session_id || null

    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO memory_records (id, class, data, summary, status, scope, project, created_at, updated_at, session_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    stmt.run(id, cls, dataStr, summary, status, scope, project, created_at, updated_at, session_id)
  }

  get(cls, id) {
    const stmt = this.db.prepare("SELECT data FROM memory_records WHERE class = ? AND id = ?")
    const row = stmt.get(cls, id)
    if (!row) return null
    return JSON.parse(row.data)
  }

  list(cls, limit = 10) {
    const stmt = this.db.prepare(`
      SELECT id, summary, status, updated_at, scope, project, data
      FROM memory_records
      WHERE class = ? AND status IN ('active')
      ORDER BY updated_at DESC, id DESC
      LIMIT ?
    `)
    const rows = stmt.all(cls, limit)
    return rows.map(r => {
      const record = JSON.parse(r.data)
      return {
        id: r.id,
        summary: r.summary,
        status: r.status,
        updated_at: r.updated_at,
        scope: r.scope,
        project: r.project,
        ...record,
      }
    })
  }

  latest(cls) {
    const stmt = this.db.prepare(`
      SELECT data FROM memory_records
      WHERE class = ? AND status IN ('active')
      ORDER BY updated_at DESC, id DESC
      LIMIT 1
    `)
    const row = stmt.get(cls)
    if (!row) return null
    return JSON.parse(row.data)
  }

  search(query, classes, project, limit = 10) {
    const clsList = Array.isArray(classes) && classes.length ? classes : ALL_CLASSES
    const lim = Math.min(limit, 50)
    const q = `%${query}%`
    const results = []

    for (const cls of clsList) {
      let sql = `SELECT data FROM memory_records WHERE class = ? AND status IN ('active') AND (summary LIKE ? OR data LIKE ?)`
      const params = [cls, q, q]

      if (project) {
        sql += ` AND (project = ? OR project IS NULL)`
        params.push(project)
      }

      sql += ` ORDER BY updated_at DESC LIMIT ?`
      params.push(lim)

      const stmt = this.db.prepare(sql)
      const rows = stmt.all(...params)
      for (const row of rows) {
        results.push(JSON.parse(row.data))
      }
    }

    return results
  }

  archive(cls, id) {
    const record = this.get(cls, id)
    if (!record) return
    record.status = "expired"
    record.updated_at = new Date().toISOString()
    this.save(cls, id, record)
  }

  count(cls) {
    const stmt = this.db.prepare("SELECT COUNT(*) as c FROM memory_records WHERE class = ? AND status IN ('active')")
    const row = stmt.get(cls)
    return row.c
  }

  all(cls) {
    const stmt = this.db.prepare("SELECT data FROM memory_records WHERE class = ? AND status IN ('active') ORDER BY updated_at DESC")
    const rows = stmt.all(cls)
    return rows.map(r => JSON.parse(r.data))
  }

  close() {
    this.db.close()
  }

  _clear(cls) {
    const stmt = this.db.prepare("DELETE FROM memory_records WHERE class = ?")
    stmt.run(cls)
  }
}

export function getStore(dbPath) {
  if (!_store) {
    const p = dbPath || getMemoryDbPath()
    try {
      _store = new MemoryStore(p)
    } catch (e) {
      const fallback = path.join(os.tmpdir(), `openhermes-memory-${Date.now()}.db`)
      _store = new MemoryStore(fallback)
    }
  }
  return _store
}

export function resetStore() {
  if (_store) {
    try { _store.close() } catch {}
    _store = null
  }
}

export async function migrateFromJson(store) {
  const memoryRoot = getMemoryRoot()
  const PLURALS = {
    audit: "audits",
    backlog: "backlog",
    checkpoint: "checkpoints",
    constraint: "constraints",
    decision: "decisions",
    instinct: "instincts",
    mistake: "mistakes",
    verification_receipt: "verification_receipts",
  }

  let hasData = false
  for (const cls of Object.keys(PLURALS)) {
    if (store.count(cls) > 0) { hasData = true; break }
  }
  if (hasData) return { migrated: 0, message: "already has data" }

  let total = 0
  for (const [cls, plural] of Object.entries(PLURALS)) {
    const dir = path.join(memoryRoot, plural)
    if (!fs.existsSync(dir)) continue

    if (cls === "mistake") {
      const jsonlPath = path.join(dir, "mistakes.jsonl")
      if (!fs.existsSync(jsonlPath)) continue
      const entries = readJsonl(jsonlPath)
      for (const entry of entries) {
        store.save(cls, entry.id, entry)
        total++
      }
    } else {
      const indexPath = path.join(dir, "index.json")
      if (!fs.existsSync(indexPath)) continue
      const index = readJson(indexPath, [])
      if (!Array.isArray(index)) continue
      for (const entry of index) {
        const filePath = path.join(dir, `${entry.id}.json`)
        if (!fs.existsSync(filePath)) continue
        try {
          const record = JSON.parse(fs.readFileSync(filePath, "utf8"))
          store.save(cls, entry.id, record)
          total++
        } catch {}
      }
    }
  }
  return { migrated: total, message: `migrated ${total} records` }
}
