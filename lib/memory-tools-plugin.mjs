import { tool } from "@opencode-ai/plugin"
import { fileURLToPath } from "node:url"
import path from "node:path"
import fs from "node:fs"
import os from "node:os"

import { atomicWriteJson, fingerprintEnvironment, readJson, readJsonl, sanitizeRecord, truncateText } from "./hardening.mjs"
import { findUnsupportedSchemaKeywords, validateSchema } from "./schema-validator.mjs"
import { getMemoryRoot, getRuntimeRoot } from "./paths.mjs"
import { loadConfig } from "./ohc/config.mjs"
import { sendMemoryNotification } from "./ohc/notify.mjs"

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
  const tokens = q.split(/\s+/).filter(t => t.length > 2)
  let score = 0

  const primaryFields = [r.summary, r.description, r.mission, r.current_state, r.failure, r.root_cause, r.fix, r.prevention, r.id].filter(Boolean)
  const secondaryFields = [r.command, r.project, r.scope].filter(Boolean)
  const listFields = [...(Array.isArray(r.tags) ? r.tags : []), ...(Array.isArray(r.next_actions) ? r.next_actions : []), ...(Array.isArray(r.refs) ? r.refs : [])].filter(Boolean)

  for (const f of primaryFields) {
    const str = String(f).toLowerCase()
    let idx = 0; let count = 0
    while ((idx = str.indexOf(q, idx)) !== -1) { count++; idx += q.length }
    score += count * 15
    if (str.startsWith(q)) score += 10
    if (str.includes(q)) score += 4
    for (const token of tokens) {
      if (str.includes(token)) score += 4
      if (str.startsWith(token)) score += 2
    }
  }

  for (const f of secondaryFields) {
    const str = String(f).toLowerCase()
    if (str.includes(q)) score += 8
    for (const token of tokens) {
      if (str.includes(token)) score += 3
    }
  }

  for (const f of listFields) {
    const str = String(f).toLowerCase()
    if (str.includes(q)) score += 5
    for (const token of tokens) {
      if (str.includes(token)) score += 2
    }
  }

  if (r.project && r.project.toLowerCase() === (project || "").toLowerCase()) score += 25
  if (r.project && project && r.project.toLowerCase().includes(project.toLowerCase())) score += 12

  const age = Date.now() - Date.parse(r.updated_at || r.created_at || 0)
  if (!Number.isNaN(age)) score += Math.max(0, 10 - age / 604800000)
  if (r.status === "active") score += 4
  if (r.status === "closed") score -= 3

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

function fillSchemaDefaults(record, schema) {
  const required = Array.isArray(schema.required) ? schema.required : []
  for (const field of required) {
    const prop = schema.properties?.[field]
    if (!prop) { if (!(field in record)) record[field] = null; continue }

    const types = Array.isArray(prop.type) ? prop.type : [prop.type]
    const t = types.find(t => t !== "null") || types[0]

    if (t === "object" && prop.properties) {
      if (record[field] == null) record[field] = {}
      if (isPlainObject(record[field])) fillSchemaDefaults(record[field], prop)
      continue
    }

    if (field in record) continue
    if (prop.default !== undefined) { record[field] = structuredClone(prop.default); continue }
    if (prop.const !== undefined) { record[field] = prop.const; continue }
    if (prop.enum) { record[field] = prop.enum[0]; continue }
    if (t === "integer" || t === "number") {
      record[field] = prop.minimum !== undefined ? prop.minimum : 0
      continue
    }
    switch (t) {
      case "string":
        record[field] = prop.minLength > 1 ? "x".repeat(prop.minLength) : field
        break
      case "boolean": record[field] = false; break
      case "array": record[field] = []; break
      default: record[field] = field; break
    }
  }
}

function sanitizeId(raw) {
  return raw.replace(/[<>:"/\\|?*]/g, "_").replace(/\.\./g, "_").trim()
}

function handleAdd(cls, id, dataStr) {
  let parsed
  try { parsed = JSON.parse(dataStr) } catch (e) { parsed = null }
  if (!isPlainObject(parsed)) {
    const txt = String(dataStr ?? parsed ?? "").slice(0, 200)
    parsed = { summary: txt }
  }
  if (!id?.trim()) return "non-blank id is required"
  id = sanitizeId(id.trim())

  const now = new Date().toISOString()
  const existing = queryGet(cls, id)
  const record = { ...parsed, id, class: cls, source: parsed.source ?? "agent", status: parsed.status ?? "active", created_at: parsed.created_at ?? (existing?.created_at ?? now), updated_at: now }

  const schema = readJson(path.join(SCHEMAS_DIR, `${cls}.schema.json`), null)
  if (schema) {
    fillSchemaDefaults(record, schema)

    const required = Array.isArray(schema.required) ? schema.required : []
    if (required.includes("provenance")) {
      if (!record.provenance?.session_id) record.provenance = { ...record.provenance, session_id: `auto-${now}` }
      if (cls === "audit" && !enforceAuditEvidence(record)) {
        const prov = record.provenance
        if (!Array.isArray(prov.file_refs)) prov.file_refs = []
        if (!prov.file_refs.some(r => typeof r === "string" && r.trim())) prov.file_refs.push("auto-filled")
      }
    }
    if (required.includes("trigger") && !record.trigger) record.trigger = "manual"
    if (required.includes("success_count") && record.success_count == null) record.success_count = 0
    if (required.includes("failure_count") && record.failure_count == null) record.failure_count = 0
    if (required.includes("promotion_state") && !record.promotion_state) record.promotion_state = "project"

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
  id = sanitizeId(id.trim())
  const record = queryGet(cls, id)
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
  id = sanitizeId(id.trim())
  const record = queryGet(cls, id)
  if (!record) return `not found: ${id}`
  record.status = "expired"
  record.updated_at = new Date().toISOString()
  if (cls === "mistake") upsertMistake(record)
  else writeObject(cls, record)
  return `archived: ${id.trim()}`
}

export const MemoryToolsPlugin = async (ctx) => {
  fs.mkdirSync(MEMORY_DIR, { recursive: true })
  fs.mkdirSync(getRuntimeRoot(), { recursive: true })

  const config = loadConfig()

  return {
    tool: {
      ohc_save: tool({
        description: "Save a new memory record or update an existing one by class and id",
        args: {
          class: tool.schema.enum(CLASSES),
          id: tool.schema.string(),
          data: tool.schema.string(),
        },
        async execute(args, context) {
          setToolTitle(context, `save ${args.class}: ${args.id}`)
          const result = handleAdd(args.class, args.id, args.data)
          if (result.startsWith("saved:") || result.startsWith("updated:")) {
            const action = result.startsWith("saved:") ? "Saved" : "Updated"
            sendMemoryNotification(ctx?.client, context.sessionID, config, action, args.class, args.id, null)
          }
          return result
        },
      }),

      ohc_get: tool({
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

      ohc_list: tool({
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

      ohc_latest: tool({
        description: "Get the latest active memory record by class",
        args: {
          class: tool.schema.enum(CLASSES).describe("Memory class"),
        },
        async execute(args, context) {
          setToolTitle(context, `latest ${args.class}`)
          return handleLatest(args.class)
        },
      }),

      ohc_search: tool({
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

      ohc_archive: tool({
        description: "Soft-delete a memory record by setting its status to expired",
        args: {
          class: tool.schema.enum(CLASSES),
          id: tool.schema.string(),
        },
        async execute(args, context) {
          setToolTitle(context, `archive ${args.class}: ${args.id}`)
          const result = handleArchive(args.class, args.id)
          if (result.startsWith("archived:")) {
            sendMemoryNotification(ctx?.client, context.sessionID, config, "Archived", args.class, args.id, null)
          }
          return result
        },
      }),
    },
  }
}
