import { tool } from "@opencode-ai/plugin"
import { fileURLToPath } from "node:url"
import path from "node:path"
import fs from "node:fs"
import os from "node:os"

import { atomicWriteJson, fingerprintEnvironment, readJson, readJsonl, sanitizeRecord, truncateText } from "./hardening.mjs"
import { findUnsupportedSchemaKeywords, validateSchema } from "./schema-validator.mjs"
import { getMemoryRoot, getRuntimeRoot } from "./paths.mjs"

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
  let index = readJson(indexPath, [])
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
  let entries = readJsonl(fp)
  const idx = entries.findIndex(e => e?.id === record.id)
  if (idx >= 0) entries[idx] = record; else entries.push(record)
  const text = entries.map(e => stableStringify(e)).join("\n")
  fs.writeFileSync(fp, text ? `${text}\n` : "", "utf8")
}

function queryList(cls, limit = 10) {
  if (cls === "mistake") {
    return sortRecent(filterActive(readJsonl(path.join(classDir(cls), "mistakes.jsonl")))).slice(0, limit)
  }
  const dir = classDir(cls)
  let files = []
  try { files = fs.readdirSync(dir).filter(f => f.endsWith(".json") && f !== "index.json").map(f => path.join(dir, f)) } catch { return [] }
  const entries = files.map(f => readJson(f, null)).filter(Boolean).map(r => buildEntry(cls, r))
  return sortRecent(filterActive(entries)).slice(0, limit)
}

function queryGet(cls, id) {
  if (cls === "mistake") return readJsonl(path.join(classDir(cls), "mistakes.jsonl")).find(e => e?.id === id) ?? null
  return readJson(path.join(classDir(cls), `${id}.json`), null)
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

function setToolTitle(context, title) {
  if (!context || typeof context.metadata !== "function") return
  context.metadata({ title })
}

function handleAdd(cls, id, dataStr) {
  let parsed
  try { parsed = JSON.parse(dataStr) } catch (e) { return `invalid JSON: ${e.message}` }
  if (!isPlainObject(parsed)) return "data must be a JSON object"
  if (!id?.trim()) return "non-blank id is required"

  const now = new Date().toISOString()
  const existing = queryGet(cls, id.trim())
  const record = { ...parsed, id, class: cls, source: parsed.source ?? "agent", status: parsed.status ?? "active", created_at: parsed.created_at ?? (existing?.created_at ?? now), updated_at: now }

  const schema = readJson(path.join(SCHEMAS_DIR, `${cls}.schema.json`), null)
  if (schema) {
    const unsupported = findUnsupportedSchemaKeywords(schema)
    if (unsupported.length) return `unsupported schema: ${unsupported.join(", ")}`
    const errs = validateSchema(schema, record, "$")
    if (cls === "audit" && !enforceAuditEvidence(record)) errs.push("$.provenance must include at least one non-empty evidence ref")
    if (errs.length) return `validation: ${errs.join("; ")}`
  }

  if (cls === "mistake") upsertMistake(record)
  else writeObject(cls, record)

  const action = existing ? "updated" : "saved"
  return `${action}: ${id.trim()}`
}

function handleFetch(cls, id) {
  if (!id?.trim()) return "non-blank id is required"
  const record = queryGet(cls, id.trim())
  if (!record) return `not found: ${id}`
  return stableStringify(record)
}

function handleList(cls, limit = 10) {
  const entries = queryList(cls, Math.min(limit, 100))
  const lines = entries.map(e => `  ${e.id}: ${truncateText(e.summary || "", 80)}`)
  return `${entries.length} ${cls} record${entries.length === 1 ? "" : "s"}\n` + lines.join("\n")
}

function handleLatest(cls) {
  const list = queryList(cls, 100)
  const active = filterActive(list)
  if (!active[0]?.id) return "no active records"
  const record = queryGet(cls, active[0].id)
  if (!record) return "no active records"
  return stableStringify(record)
}

function handleSearch(query, scope, classes, project, limit) {
  const q = (query || "").trim()
  if (!q) return "non-blank query is required"
  const clsList = Array.isArray(classes) && classes.length ? classes : CLASSES
  const lim = Math.min(limit ?? 10, 50)
  let records = []
  for (const cls of clsList) {
    if (cls === "mistake") {
      for (const m of readJsonl(path.join(classDir(cls), "mistakes.jsonl"))) {
        if (!hasExpired(m)) records.push(m)
      }
    } else {
      const dir = classDir(cls)
      let files = []
      try { files = fs.readdirSync(dir).filter(f => f.endsWith(".json") && f !== "index.json") } catch { continue }
      for (const f of files) {
        const r = readJson(path.join(dir, f), null)
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
  const lines = scored.map(e => `  ${e.id} (${e.score}pt): ${truncateText(e.summary || "", 80)}`)
  return `${scored.length} result${scored.length === 1 ? "" : "s"} for '${q}'\n` + lines.join("\n")
}

function handleArchive(cls, id) {
  if (!id?.trim()) return "non-blank id is required"
  const record = queryGet(cls, id.trim())
  if (!record) return `not found: ${id}`
  record.status = "expired"
  record.updated_at = new Date().toISOString()
  if (cls === "mistake") upsertMistake(record)
  else writeObject(cls, record)
  return `archived: ${id.trim()}`
}

export const MemoryToolsPlugin = async () => {
  fs.mkdirSync(MEMORY_DIR, { recursive: true })
  fs.mkdirSync(getRuntimeRoot(), { recursive: true })

  return {
    tool: {
      add_memory: tool({
        description: "Save a new memory record or update an existing one by class and id",
        args: {
          class: tool.schema.enum(CLASSES),
          id: tool.schema.string(),
          data: tool.schema.string(),
        },
        async execute(args, context) {
          setToolTitle(context, `save ${args.class}: ${args.id}`)
          return handleAdd(args.class, args.id, args.data)
        },
      }),

      fetch_memory: tool({
        description: "Get a specific memory record by class and id",
        args: {
          class: tool.schema.enum(CLASSES).describe("Memory class"),
          id: tool.schema.string().describe("Record ID"),
        },
        async execute(args, context) {
          setToolTitle(context, `fetch ${args.class}: ${args.id}`)
          return handleFetch(args.class, args.id)
        },
      }),

      list_memory: tool({
        description: "List recent memory records by class, sorted by recency",
        args: {
          class: tool.schema.enum(CLASSES).describe("Memory class"),
          limit: tool.schema.number().optional().default(10).describe("Max results (max 100)"),
        },
        async execute(args, context) {
          setToolTitle(context, `list ${args.class}`)
          return handleList(args.class, args.limit)
        },
      }),

      latest_memory: tool({
        description: "Get the latest active memory record by class",
        args: {
          class: tool.schema.enum(CLASSES).describe("Memory class"),
        },
        async execute(args, context) {
          setToolTitle(context, `latest ${args.class}`)
          return handleLatest(args.class)
        },
      }),

      search_memory: tool({
        description: "Search memory records with keyword matching and relevance ranking across all classes",
        args: {
          query: tool.schema.string().describe("Search query string"),
          scope: tool.schema.enum(["global", "local", "auto"]).optional().default("auto").describe("Search scope"),
          classes: tool.schema.array(tool.schema.enum(CLASSES)).optional().describe("Memory classes to search (default: all)"),
          project: tool.schema.string().optional().describe("Project filter"),
          limit: tool.schema.number().optional().default(10).describe("Max results (max 50)"),
        },
        async execute(args, context) {
          setToolTitle(context, `search: ${truncateText(args.query, 48)}`)
          return handleSearch(args.query, args.scope, args.classes, args.project, args.limit)
        },
      }),

      archive_memory: tool({
        description: "Soft-delete a memory record by setting its status to expired",
        args: {
          class: tool.schema.enum(CLASSES),
          id: tool.schema.string(),
        },
        async execute(args, context) {
          setToolTitle(context, `archive ${args.class}: ${args.id}`)
          return handleArchive(args.class, args.id)
        },
      }),
    },
  }
}
