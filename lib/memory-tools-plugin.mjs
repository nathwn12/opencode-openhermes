import { tool } from "@opencode-ai/plugin"
import { fileURLToPath } from "node:url"
import path from "node:path"
import fs from "node:fs"
import os from "node:os"

import { atomicWriteJson, fingerprintEnvironment, readJson, readJsonl, sanitizeRecord, truncateText } from "./hardening.mjs"
import { findUnsupportedSchemaKeywords, validateSchema } from "./schema-validator.mjs"
import { getMemoryRoot, getRuntimeRoot } from "./paths.mjs"
import { getStore } from "./memory-store.mjs"
import { loadConfig } from "./ohc/config.mjs"
import { sendMemoryNotification } from "./ohc/notify.mjs"
import { scoreRelevance } from "./search.mjs"
import { createLogger } from "./logger.mjs"

const log = createLogger("memory-tools")

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const SCHEMAS_DIR = path.resolve(__dirname, "..", "schemas")

const CLASSES = ["audit", "checkpoint", "mistake", "instinct", "decision", "constraint", "backlog", "verification_receipt"]
const PLURALS = { audit: "audits", checkpoint: "checkpoints", mistake: "mistakes", instinct: "instincts", decision: "decisions", constraint: "constraints", backlog: "backlog", verification_receipt: "verification_receipts" }

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
  const existing = getStore().get(cls, id)
  const existingIsActive = existing && !hasExpired(existing)
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

    const unsupported = findUnsupportedSchemaKeywords(schema)
    if (unsupported.length) return `unsupported schema: ${unsupported.join(", ")}`
    const errs = validateSchema(schema, record, "$")
    if (cls === "audit" && !enforceAuditEvidence(record)) errs.push("$.provenance must include at least one non-empty evidence ref")
    if (errs.length) return `validation: ${errs.join("; ")}`
  }

  getStore().save(cls, id, record)

  const action = existingIsActive ? "updated" : "saved"
  return `${action}: ${id.trim()}`
}

function handleFetch(cls, id) {
  if (!id?.trim()) return "non-blank id is required"
  id = sanitizeId(id.trim())
  const record = getStore().get(cls, id)
  if (!record) return `not found: ${id}`
  return stableStringify(record)
}

function handleList(cls, limit = 10) {
  const entries = getStore().list(cls, Math.min(limit, 100))
  const lines = entries.map(e => `  ${e.id}: ${truncateText(e.summary || "", 80)}`)
  return `${entries.length} ${cls} record${entries.length === 1 ? "" : "s"}\n` + lines.join("\n")
}

function handleLatest(cls) {
  const record = getStore().latest(cls)
  if (!record) return "no active records"
  return stableStringify(record)
}

function handleSearch(query, scope, classes, project, limit) {
  const q = (query || "").trim()
  if (!q) return "non-blank query is required"
  const clsList = Array.isArray(classes) && classes.length ? classes : CLASSES
  const lim = Math.min(limit ?? 10, 50)

  let candidates = getStore().search(q, clsList, project, 100)
    .filter(r => !hasExpired(r))

  if (scope === "global") candidates = candidates.filter(r => r.scope === "global" || !r.scope)
  else if (scope === "local") candidates = candidates.filter(r => r.scope === "project" || r.scope === "session")

  const scored = candidates
    .map(e => ({ ...e, score: scoreRelevance(e, q, project || "") }))
    .filter(e => e.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, lim)

  const lines = scored.map(e => `  ${e.id} (${e.score}pt): ${truncateText(e.summary || "", 80)}`)
  return `${scored.length} result${scored.length === 1 ? "" : "s"} for '${q}'\n` + lines.join("\n")
}

function handleArchive(cls, id) {
  if (!id?.trim()) return "non-blank id is required"
  id = sanitizeId(id.trim())
  const record = getStore().get(cls, id)
  if (!record) return `not found: ${id}`
  record.status = "expired"
  record.updated_at = new Date().toISOString()
  getStore().save(cls, id, record)
  return `archived: ${id.trim()}`
}

export const MemoryToolsPlugin = async (ctx) => {
  fs.mkdirSync(getMemoryRoot(), { recursive: true })
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
          try {
            setToolTitle(context, `save ${args.class}: ${args.id}`)
            const result = handleAdd(args.class, args.id, args.data)
            if (result.startsWith("saved:") || result.startsWith("updated:")) {
              const action = result.startsWith("saved:") ? "Saved" : "Updated"
              sendMemoryNotification(ctx?.client, context.sessionID, config, action, args.class, args.id, null).catch(() => {})
            }
            return result
          } catch (err) {
            log.error("ohc_save error:", err?.message)
            return `error: ${err?.message}`
          }
        },
      }),

      ohc_get: tool({
        description: "Get a specific memory record by class and id",
        args: {
          class: tool.schema.enum(CLASSES).describe("Memory class"),
          id: tool.schema.string().describe("Record ID"),
        },
        async execute(args, context) {
          try {
            setToolTitle(context, `fetch ${args.class}: ${args.id}`)
            return handleFetch(args.class, args.id)
          } catch (err) {
            log.error("ohc_get error:", err?.message)
            return `error: ${err?.message}`
          }
        },
      }),

      ohc_list: tool({
        description: "List recent memory records by class, sorted by recency",
        args: {
          class: tool.schema.enum(CLASSES).describe("Memory class"),
          limit: tool.schema.number().optional().default(10).describe("Max results (max 100)"),
        },
        async execute(args, context) {
          try {
            setToolTitle(context, `list ${args.class}`)
            return handleList(args.class, args.limit)
          } catch (err) {
            log.error("ohc_list error:", err?.message)
            return `error: ${err?.message}`
          }
        },
      }),

      ohc_latest: tool({
        description: "Get the latest active memory record by class",
        args: {
          class: tool.schema.enum(CLASSES).describe("Memory class"),
        },
        async execute(args, context) {
          try {
            setToolTitle(context, `latest ${args.class}`)
            return handleLatest(args.class)
          } catch (err) {
            log.error("ohc_latest error:", err?.message)
            return `error: ${err?.message}`
          }
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
          try {
            setToolTitle(context, `search: ${truncateText(args.query, 48)}`)
            return handleSearch(args.query, args.scope, args.classes, args.project, args.limit)
          } catch (err) {
            log.error("ohc_search error:", err?.message)
            return `error: ${err?.message}`
          }
        },
      }),

      ohc_archive: tool({
        description: "Soft-delete a memory record by setting its status to expired",
        args: {
          class: tool.schema.enum(CLASSES),
          id: tool.schema.string(),
        },
        async execute(args, context) {
          try {
            setToolTitle(context, `archive ${args.class}: ${args.id}`)
            const result = handleArchive(args.class, args.id)
            if (result.startsWith("archived:")) {
              sendMemoryNotification(ctx?.client, context.sessionID, config, "Archived", args.class, args.id, null).catch(() => {})
            }
            return result
          } catch (err) {
            log.error("ohc_archive error:", err?.message)
            return `error: ${err?.message}`
          }
        },
      }),
    },
  }
}
