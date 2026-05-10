import fs from "fs"
import path from "path"
import os from "os"

const ROOT = path.join(os.homedir(), ".config", "opencode", "openhermes")
const MEMORY_DIR = path.join(ROOT, "memory")

const CLASSES = ["audit", "checkpoint", "mistake", "instinct", "decision", "constraint", "backlog", "verification_receipt"]
const PLURALS = {
  audit: "audits", checkpoint: "checkpoints", mistake: "mistakes",
  instinct: "instincts", decision: "decisions", constraint: "constraints",
  backlog: "backlog", verification_receipt: "verification_receipts",
}

function isPlainObject(v) { return !!v && typeof v === "object" && !Array.isArray(v) }

function stableStringify(v, space = 0) {
  function sort(o) {
    if (Array.isArray(o)) return o.map(sort)
    if (!isPlainObject(o)) return o
    const r = {}
    for (const k of Object.keys(o).sort()) r[k] = sort(o[k])
    return r
  }
  return JSON.stringify(sort(v), null, space)
}

function classDir(cls) { return path.join(MEMORY_DIR, PLURALS[cls]) }

function atomicWriteJson(fp, data) {
  const tmp = fp + ".tmp"
  fs.writeFileSync(tmp, stableStringify(data, 2), "utf8")
  fs.renameSync(tmp, fp)
}

function readJSON(fp, fallback) {
  try { return JSON.parse(fs.readFileSync(fp, "utf8")) } catch { return fallback }
}

function readJSONL(fp) {
  try {
    return fs.readFileSync(fp, "utf8").split(/\r?\n/).map(l => l.trim()).filter(Boolean).map(l => JSON.parse(l))
  } catch { return [] }
}

function buildEntry(cls, r) {
  const e = {
    id: r.id, summary: r.summary, status: r.status,
    updated_at: r.updated_at ?? r.created_at,
    path: path.join("openhermes", "memory", PLURALS[cls], `${r.id}.json`),
    scope: r.scope ?? null, project: r.project ?? null,
  }
  if (cls === "audit") { e.target = r.target; e.overall_score = r.overall_score }
  if (cls === "backlog") { e.priority = r.priority; e.trigger = r.trigger }
  return e
}

function hasExpired(r) {
  if (r?.status === "expired" || r?.status === "decayed") return true
  if (r?.decay_at && Date.parse(r.decay_at) < Date.now()) return true
  if (r?.expires_at && Date.parse(r.expires_at) < Date.now()) return true
  return false
}

function sortRecent(entries) {
  function ts(e) { return e?.updated_at ?? e?.created_at ?? "" }
  return [...entries].sort((a, b) => {
    const at = Date.parse(ts(a)), bt = Date.parse(ts(b))
    if (!Number.isNaN(at) && !Number.isNaN(bt) && at !== bt) return bt - at
    return String(ts(b)).localeCompare(String(ts(a)))
  })
}

function filterActive(entries) { return entries.filter(e => !hasExpired(e)) }

function validateSchemaSimple(record) {
  const required = {
    audit: ["id", "class", "summary", "target", "overall_score", "checks"],
    checkpoint: ["id", "class", "summary", "mission", "current_state", "provenance"],
    mistake: ["id", "class", "summary", "failure", "root_cause", "type", "strike"],
    instinct: ["id", "class", "summary", "claim", "provenance"],
    decision: ["id", "class", "summary", "decision", "rationale", "provenance"],
    constraint: ["id", "class", "summary", "constraint", "provenance"],
    backlog: ["id", "class", "summary", "priority"],
    verification_receipt: ["id", "class", "summary", "fingerprint", "method", "result"],
  }
  const cls = record.class
  const reqs = required[cls]
  if (!reqs) return { ok: true }
  const missing = reqs.filter(r => !record[r] && record[r] !== null && record[r] !== undefined)
  if (missing.length) return { ok: false, errors: missing.map(m => `$.${m} is required`) }
  return { ok: true }
}

function queryList(cls, limit = 10) {
  if (cls === "mistake") {
    return sortRecent(filterActive(readJSONL(path.join(classDir(cls), "mistakes.jsonl")))).slice(0, limit)
  }
  const dir = classDir(cls)
  let files = []
  try { files = fs.readdirSync(dir).filter(f => f.endsWith(".json") && f !== "index.json").map(f => path.join(dir, f)) } catch { return [] }
  const entries = files.map(f => readJSON(f, null)).filter(Boolean).map(r => buildEntry(cls, r))
  return sortRecent(filterActive(entries)).slice(0, limit)
}

function queryGet(cls, id) {
  if (cls === "mistake") return readJSONL(path.join(classDir(cls), "mistakes.jsonl")).find(e => e?.id === id) ?? null
  return readJSON(path.join(classDir(cls), `${id}.json`), null)
}

function scoreRelevance(r, query, project) {
  const q = query.toLowerCase()
  let score = 0
  const fields = [r.summary, r.id, r.description, r.mission, r.current_state, r.failure, r.root_cause, r.fix, r.prevention, r.command, r.project, r.scope, ...(Array.isArray(r.tags) ? r.tags : []), ...(Array.isArray(r.next_actions) ? r.next_actions : []), ...(Array.isArray(r.refs) ? r.refs : [])].filter(Boolean)
  for (const f of fields) {
    const str = String(f).toLowerCase()
    let idx = 0; let count = 0
    while ((idx = str.indexOf(q, idx)) !== -1) { count++; idx += q.length }
    score += count * 10
    if (str.startsWith(q)) score += 5
    if (str.includes(q)) score += 2
  }
  if (r.project && r.project.toLowerCase() === (project || "").toLowerCase()) score += 20
  if (r.project && project && r.project.toLowerCase().includes(project.toLowerCase())) score += 10
  const age = Date.now() - Date.parse(r.updated_at || r.created_at || 0)
  if (!Number.isNaN(age)) score += Math.max(0, 10 - age / 604800000)
  if (r.status === "active") score += 3
  if (r.status === "closed") score -= 2
  return score
}

function writeObject(cls, record) {
  const dir = classDir(cls)
  fs.mkdirSync(dir, { recursive: true })
  const fp = path.join(dir, `${record.id}.json`)
  atomicWriteJson(fp, record)
  const indexPath = path.join(dir, "index.json")
  let index = readJSON(indexPath, [])
  if (!Array.isArray(index)) index = []
  const idx = index.findIndex(e => e?.id === record.id)
  const entry = buildEntry(cls, record)
  if (idx >= 0) index[idx] = entry; else index.push(entry)
  atomicWriteJson(indexPath, index)
}

function upsertMistake(record) {
  const dir = classDir("mistake")
  fs.mkdirSync(dir, { recursive: true })
  const fp = path.join(dir, "mistakes.jsonl")
  let entries = readJSONL(fp)
  const idx = entries.findIndex(e => e?.id === record.id)
  if (idx >= 0) entries[idx] = record; else entries.push(record)
  const text = entries.map(e => stableStringify(e)).join("\n")
  fs.writeFileSync(fp, text ? `${text}\n` : "", "utf8")
}

export function handlePut(cls, id, dataStr) {
  let parsed
  try { parsed = JSON.parse(dataStr) } catch (e) { return `data must be valid JSON: ${e.message}` }
  if (!isPlainObject(parsed)) return "data must be a JSON object"
  if (!id?.trim()) return "non-blank id is required"

  const now = new Date().toISOString()
  const record = {
    ...parsed, id, class: cls,
    source: parsed.source ?? "agent",
    status: parsed.status ?? "active",
    created_at: parsed.created_at ?? now,
    updated_at: now,
  }

  const validation = validateSchemaSimple(record)
  if (!validation.ok) return `Validation errors: ${validation.errors.join("; ")}`

  if (cls === "mistake") upsertMistake(record)
  else writeObject(cls, record)

  return stableStringify({ ok: true, id })
}

export function handleGet(cls, id) {
  if (!id?.trim()) return "non-blank id is required"
  const record = queryGet(cls, id.trim())
  if (!record) return stableStringify({ ok: false, found: false })
  return stableStringify({ ok: true, record })
}

export function handleList(cls, limit = 10) {
  const entries = queryList(cls, Math.min(limit, 100))
  return stableStringify({ ok: true, count: entries.length, entries })
}

export function handleLatest(cls) {
  const list = queryList(cls, 100)
  const active = filterActive(list)
  if (!active[0]?.id) return stableStringify({ ok: false, found: false })
  const record = queryGet(cls, active[0].id)
  if (!record) return stableStringify({ ok: false, found: false })
  return stableStringify({ ok: true, record })
}

export function handleSearch(query, scope, classes, project, limit) {
  const q = (query || "").trim()
  if (!q) return "non-blank query is required"
  const clsList = Array.isArray(classes) && classes.length ? classes : CLASSES
  const lim = Math.min(limit ?? 10, 50)
  let records = []
  for (const cls of clsList) {
    if (cls === "mistake") {
      for (const m of readJSONL(path.join(classDir(cls), "mistakes.jsonl"))) {
        if (!hasExpired(m)) records.push(m)
      }
    } else {
      const dir = classDir(cls)
      let files = []
      try { files = fs.readdirSync(dir).filter(f => f.endsWith(".json") && f !== "index.json") } catch { continue }
      for (const f of files) {
        const r = readJSON(path.join(dir, f), null)
        if (r && !hasExpired(r)) records.push(r)
      }
    }
  }
  if (scope === "global") records = records.filter(r => r.scope === "global" || !r.scope)
  else if (scope === "local") records = records.filter(r => r.scope === "project" || r.scope === "session")
  const scored = records.map(r => ({ ...buildEntry(r.class || "verification_receipt", r), score: scoreRelevance(r, q, project || "") }))
    .filter(e => e.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, lim)
  return stableStringify({ ok: true, count: scored.length, query: q, results: scored })
}
