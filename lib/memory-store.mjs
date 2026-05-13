import path from "node:path"
import os from "node:os"
import { getMemoryDbPath } from "./paths.mjs"
import { SQLITE_DRIVER } from "./sqlite-adapter.mjs"
import { createLogger } from "./logger.mjs"
const log = createLogger("memory-store")

export const CORE_CLASSES = ["checkpoint", "mistake", "decision"]
const ALL_CLASSES = CORE_CLASSES

let _store = null

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
        fingerprint_hash TEXT,
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
    this.db.exec(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_mr_unique_fp ON memory_records(class, id, fingerprint_hash)
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
    try {
      const dataStr = JSON.stringify(record)
      const summary = record.summary || null
      const status = record.status || "active"
      const scope = record.scope || null
      const project = record.project || null
      const created_at = record.created_at || new Date().toISOString()
      const updated_at = record.updated_at || new Date().toISOString()
      const session_id = record.provenance?.session_id || null
      const fingerprint_hash = record.fingerprint_hash || null

      const stmt = this.db.prepare(`
        INSERT OR REPLACE INTO memory_records (id, class, data, summary, status, scope, project, created_at, updated_at, session_id, fingerprint_hash)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      stmt.run(id, cls, dataStr, summary, status, scope, project, created_at, updated_at, session_id, fingerprint_hash)
    } catch (err) {
      log.error("save failed", cls, id, err.message)
    }
  }

  get(cls, id) {
    try {
      const stmt = this.db.prepare("SELECT data FROM memory_records WHERE class = ? AND id = ?")
      const row = stmt.get(cls, id)
      if (!row) return null
      return JSON.parse(row.data)
    } catch (err) {
      log.error("get failed", cls, id, err.message)
      return null
    }
  }

  list(cls, limit = 10) {
    try {
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
        return { id: record.id ?? r.id, summary: record.summary ?? r.summary, status: record.status ?? r.status, updated_at: record.updated_at ?? r.updated_at, scope: record.scope ?? r.scope, project: record.project ?? r.project }
      })
    } catch (err) {
      log.error("list failed", cls, err.message)
      return []
    }
  }

  latest(cls) {
    try {
      const stmt = this.db.prepare(`
        SELECT data FROM memory_records
        WHERE class = ? AND status IN ('active')
        ORDER BY updated_at DESC, id DESC
        LIMIT 1
      `)
      const row = stmt.get(cls)
      if (!row) return null
      return JSON.parse(row.data)
    } catch (err) {
      log.error("latest failed", cls, err.message)
      return null
    }
  }

  query(project, limit = 5) {
    try {
      const results = []
      for (const cls of ALL_CLASSES) {
        const stmt = this.db.prepare(`
          SELECT data FROM memory_records
          WHERE class = ? AND status IN ('active')
            AND (project = ? OR project IS NULL)
          ORDER BY updated_at DESC LIMIT ?
        `)
        for (const row of stmt.all(cls, project || "", limit)) {
          results.push(JSON.parse(row.data))
        }
      }
      return results.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at)).slice(0, limit)
    } catch (err) {
      log.error("query failed", err.message)
      return []
    }
  }

  all(cls) {
    try {
      const stmt = this.db.prepare("SELECT data FROM memory_records WHERE class = ? AND status IN ('active') ORDER BY updated_at DESC")
      const rows = stmt.all(cls)
      return rows.map(r => JSON.parse(r.data))
    } catch (err) {
      log.error("all failed", cls, err.message)
      return []
    }
  }

  search(query, classes, project, limit = 10) {
    try {
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
    } catch (err) {
      log.error("search failed", err.message)
      return []
    }
  }

  close() {
    try { this.db.close() } catch { log.warn("close failed") }
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
    try { _store.close() } catch (err) { log.warn("resetStore close failed", err?.message) }
    _store = null
  }
}
