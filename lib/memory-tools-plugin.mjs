import { tool } from "@opencode-ai/plugin"
import { fileURLToPath } from "url"
import path from "path"
import fs from "fs"
import os from "os"

import { atomicWriteJson, fingerprintEnvironment, sanitizeRecord, truncateText } from "./hardening.mjs"
import { findUnsupportedSchemaKeywords, validateSchema } from "./schema-validator.mjs"
import { getMemoryRoot, getRuntimeRoot } from "../lib/paths.mjs"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const SCHEMAS_DIR = path.resolve(__dirname, "..", "schemas")
const MEMORY_DIR = getMemoryRoot()

const CLASSES = ["audit", "checkpoint", "mistake", "instinct", "decision", "constraint", "backlog", "verification_receipt"]
const PLURALS = { audit: "audits", checkpoint: "checkpoints", mistake: "mistakes", instinct: "instincts", decision: "decisions", constraint: "constraints", backlog: "backlog", verification_receipt: "verification_receipts" }

function isPlainObject(v) { return !!v && typeof v === "object" && !Array.isArray(v) }

function classDir(cls) { return path.join(MEMORY_DIR, PLURALS[cls]) }

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

function buildEntry(cls, r) {
  const e = { id: r.id, summary: r.summary, status: r.status, updated_at: r.updated_at ?? r.created_at, path: path.join("openhermes", "memory", PLURALS[cls], `${r.id}.json`), scope: r.scope ?? null, project: r.project ?? null }
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

function readJSON(fp, fallback) {
  try { return JSON.parse(fs.readFileSync(fp, "utf8")) } catch { return fallback }
}

function readJSONL(fp) {
  try {
    return fs.readFileSync(fp, "utf8").split(/\r?\n/).map(l => l.trim()).filter(Boolean).map(l => JSON.parse(l))
  } catch { return [] }
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

function enforceAuditEvidence(record) {
  const prov = isPlainObject(record.provenance) ? record.provenance : {}
  return ["db_refs", "file_refs", "log_refs"].some(k => Array.isArray(prov[k]) && prov[k].some(i => typeof i === "string" && i.trim()))
}

function setToolTitle(context, title, metadata = {}) {
  if (!context || typeof context.metadata !== "function") return
  context.metadata({ title, metadata })
}

function classifyPutTitle(cls, id) {
  const label = String(id || "").trim() || "unnamed"
  if (cls === "checkpoint") return `Save checkpoint: ${label}`
  if (cls === "verification_receipt") return `Save verification receipt: ${label}`
  return `Save ${cls}: ${label}`
}

function handlePut(cls, id, dataStr) {
  let parsed
  try { parsed = JSON.parse(dataStr) } catch (e) { return `data must be valid JSON: ${e.message}` }
  if (!isPlainObject(parsed)) return "data must be a JSON object"
  if (!id?.trim()) return "non-blank id is required"

  const now = new Date().toISOString()
  const record = { ...parsed, id, class: cls, source: parsed.source ?? "agent", status: parsed.status ?? "active", created_at: parsed.created_at ?? now, updated_at: now }

  const schema = readJSON(path.join(SCHEMAS_DIR, `${cls}.schema.json`), null)
  if (schema) {
    const unsupported = findUnsupportedSchemaKeywords(schema)
    if (unsupported.length) return `Unsupported schema keywords: ${unsupported.join(", ")}`
    const errs = validateSchema(schema, record, "$")
    if (cls === "audit" && !enforceAuditEvidence(record)) errs.push("$.provenance must include at least one non-empty evidence ref")
    if (errs.length) return `Validation errors: ${errs.join("; ")}`
  }

  if (cls === "mistake") upsertMistake(record)
  else writeObject(cls, record)

  return stableStringify({ ok: true, id })
}

function handleGet(cls, id) {
  if (!id?.trim()) return "non-blank id is required"
  const record = queryGet(cls, id.trim())
  if (!record) return stableStringify({ ok: false, found: false })
  return stableStringify({ ok: true, record })
}

function handleList(cls, limit = 10) {
  const entries = queryList(cls, Math.min(limit, 100))
  return stableStringify({ ok: true, count: entries.length, entries })
}

function handleLatest(cls) {
  const list = queryList(cls, 100)
  const active = filterActive(list)
  if (!active[0]?.id) return stableStringify({ ok: false, found: false })
  const record = queryGet(cls, active[0].id)
  if (!record) return stableStringify({ ok: false, found: false })
  return stableStringify({ ok: true, record })
}

function handleSearch(query, scope, classes, project, limit) {
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

export const MemoryToolsPlugin = async () => {
  fs.mkdirSync(MEMORY_DIR, { recursive: true })
  fs.mkdirSync(getRuntimeRoot(), { recursive: true })

  return {
    tool: {
      hm_put: tool({
        description: "Create or update an OpenHermes memory record",
        args: {
          class: tool.schema.enum(CLASSES),
          id: tool.schema.string(),
          data: tool.schema.string(),
        },
        async execute(args, context) {
          setToolTitle(context, classifyPutTitle(args.class, args.id), { action: "put", class: args.class, id: args.id })
          return handlePut(args.class, args.id, args.data)
        },
      }),

      hm_get: tool({
        description: "Get a specific OpenHermes memory record by ID",
        args: {
          class: tool.schema.enum(CLASSES).describe("Memory class"),
          id: tool.schema.string().describe("Record ID"),
        },
        async execute(args, context) {
          setToolTitle(context, `Open ${args.class}: ${args.id}`, { action: "get", class: args.class, id: args.id })
          return handleGet(args.class, args.id)
        },
      }),

      hm_list: tool({
        description: "List OpenHermes memory records by class, sorted by recency",
        args: {
          class: tool.schema.enum(CLASSES).describe("Memory class"),
          limit: tool.schema.number().optional().default(10).describe("Max results (max 100)"),
        },
        async execute(args, context) {
          setToolTitle(context, `List ${args.class} records`, { action: "list", class: args.class, limit: args.limit })
          return handleList(args.class, args.limit)
        },
      }),

      hm_latest: tool({
        description: "Get the latest active OpenHermes memory record by class",
        args: {
          class: tool.schema.enum(CLASSES).describe("Memory class"),
        },
        async execute(args, context) {
          setToolTitle(context, `Latest ${args.class}`, { action: "latest", class: args.class })
          return handleLatest(args.class)
        },
      }),

      hm_search: tool({
        description: "Search OpenHermes memory records with keyword matching and relevance ranking",
        args: {
          query: tool.schema.string().describe("Search query string"),
          scope: tool.schema.enum(["global", "local", "auto"]).optional().default("auto").describe("Search scope"),
          classes: tool.schema.array(tool.schema.enum(CLASSES)).optional().describe("Memory classes to search (default: all)"),
          project: tool.schema.string().optional().describe("Project filter"),
          limit: tool.schema.number().optional().default(10).describe("Max results (max 50)"),
        },
        async execute(args, context) {
          setToolTitle(context, `Search memory: ${truncateText(args.query, 48)}`, {
            action: "search",
            scope: args.scope,
            classes: args.classes?.length ? args.classes : CLASSES,
            project: args.project ?? null,
            limit: args.limit,
          })
          return handleSearch(args.query, args.scope, args.classes, args.project, args.limit)
        },
      }),

    },
  }
}
