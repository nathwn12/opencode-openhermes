import path from "node:path"
import os from "node:os"
import { getMemoryDbPath } from "./paths.mjs"
import { SQLITE_DRIVER } from "./sqlite-adapter.mjs"

const ALL_CLASSES = ["audit", "backlog", "checkpoint", "constraint", "decision", "instinct", "mistake", "verification_receipt"]

let _store = null
let _storeDegraded = null

export class MemoryStore {
  constructor(dbPath) {
    this.db = new SQLITE_DRIVER(dbPath)
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
    this._setSchemaVersion()
  }

  _setSchemaVersion() {
    const row = this.db.prepare("PRAGMA user_version").get()
    const current = row?.user_version ?? (typeof row === "number" ? row : 0)
    if (current === 0) {
      this.db.exec("PRAGMA user_version = 1")
    }
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
      let sql = `SELECT data FROM memory_records WHERE class = ? AND status IN ('active') AND summary LIKE ?`
      const params = [cls, q]

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
      _storeDegraded = null
    } catch (e) {
      const fallback = path.join(os.tmpdir(), `openhermes-memory-${Date.now()}.db`)
      _store = new MemoryStore(fallback)
      _storeDegraded = {
        degraded: true,
        primaryPath: p,
        fallbackPath: fallback,
        error: e.message || String(e),
      }
    }
  }
  return _store
}

export function isStoreDegraded() {
  return _storeDegraded !== null
}

export function getStoreDegradedInfo() {
  return _storeDegraded
}

export function resetStore() {
  if (_store) {
    try { _store.close() } catch {}
    _store = null
  }
  _storeDegraded = null
}


