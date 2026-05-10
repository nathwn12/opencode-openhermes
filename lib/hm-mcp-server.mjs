import { fileURLToPath } from "url"
import { promises as fs } from "fs"
import path from "path"
import os from "os"
import { findUnsupportedSchemaKeywords, validateSchema } from "./schema-validator.mjs"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PACKAGE_SCHEMAS_DIR = path.resolve(__dirname, "..", "schemas")

const CLASSES = ["audit", "checkpoint", "mistake", "instinct", "decision", "constraint", "backlog", "verification_receipt"]
const PLURALS = { audit: "audits", checkpoint: "checkpoints", mistake: "mistakes", instinct: "instincts", decision: "decisions", constraint: "constraints", backlog: "backlog", verification_receipt: "verification_receipts" }
const SUPPORTED_SCHEMA_KEYS = new Set(["type", "const", "enum", "format", "minimum", "maximum", "required", "properties", "items"])
const SCHEMA_METADATA_KEYS = new Set(["$schema", "title", "description", "default"])

const TOOLS = [
  {
    name: "hm_put",
    description: "Create or update an OpenHermes memory record",
    inputSchema: {
      type: "object",
      properties: {
        class: { type: "string", enum: CLASSES, description: "Memory class" },
        id: { type: "string", description: "Record ID" },
        data: { type: "string", description: "JSON object string for the record" },
      },
      required: ["class", "id", "data"],
    },
  },
  {
    name: "hm_get",
    description: "Get a specific OpenHermes memory record",
    inputSchema: {
      type: "object",
      properties: {
        class: { type: "string", enum: CLASSES, description: "Memory class" },
        id: { type: "string", description: "Record ID" },
      },
      required: ["class", "id"],
    },
  },
  {
    name: "hm_list",
    description: "List OpenHermes memory records by class",
    inputSchema: {
      type: "object",
      properties: {
        class: { type: "string", enum: CLASSES, description: "Memory class" },
        limit: { type: "integer", minimum: 1, maximum: 100, default: 10 },
      },
      required: ["class"],
    },
  },
  {
    name: "hm_latest",
    description: "Get the latest OpenHermes memory record by class",
    inputSchema: {
      type: "object",
      properties: {
        class: { type: "string", enum: CLASSES, description: "Memory class" },
      },
      required: ["class"],
    },
  },
  {
    name: "hm_search",
    description: "Search OpenHermes memory records with keyword matching and relevance ranking. Returns ranked results with scores. IMPORTANT: After calling hm_search, summarize the top results in plain language — extract key findings, patterns, and actionable insights. Do not just echo raw JSON.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Search query string" },
        scope: { type: "string", enum: ["global", "local", "auto"], default: "auto", description: "Search scope" },
        classes: { type: "array", items: { type: "string", enum: CLASSES }, description: "Memory classes to search (default: all)" },
        project: { type: "string", description: "Project filter" },
        limit: { type: "integer", minimum: 1, maximum: 50, default: 10 },
      },
      required: ["query"],
    },
  },
]

const SERVER_INFO = {
  name: "openhermes-memory-server",
  version: "1.0.0",
}

const HARD_FALLBACK_ROOT = path.join(os.homedir(), ".config", "opencode", "openhermes")

function isTruthy(value) {
  return /^(1|true|yes|on)$/i.test(String(value || ""))
}

async function getHarnessRoot() {
  try {
    const opencodeConfigRoot = path.join(process.env.USERPROFILE || os.homedir(), ".config", "opencode")
    const root = path.join(opencodeConfigRoot, "openhermes")
    await fs.mkdir(path.join(root, "memory"), { recursive: true })
    await fs.mkdir(path.join(root, "runtime"), { recursive: true })
    return root
  } catch (e) {
    process.stderr.write(`hm-mcp-server: getHarnessRoot() failed: ${e.message}\n`)
    return HARD_FALLBACK_ROOT
  }
}

async function dirExists(p) {
  try { return (await fs.stat(p)).isDirectory() } catch { return false }
}

async function findProjectRoot(startDir) {
  let current = path.resolve(startDir)
  while (true) {
    if (await hasProjectMarker(current)) return current
    const parent = path.dirname(current)
    if (parent === current) return null
    current = parent
  }
}

async function hasProjectMarker(dir) {
  const markers = [".git", "package.json", "Cargo.toml", "pyproject.toml", "go.mod", "Gemfile", "Makefile"]
  for (const marker of markers) {
    try { await fs.access(path.join(dir, marker)); return true } catch {}
  }
  try { if ((await fs.stat(path.join(dir, "src"))).isDirectory()) return true } catch {}
  return false
}

function isWithinDir(child, parent) {
  const relative = path.relative(parent, child)
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative))
}

function classDir(root, cls) { return path.join(root, "memory", PLURALS[cls]) }

function stableStringify(value, space = 0) { return JSON.stringify(sortValue(value), null, space) }
function sortValue(value) {
  if (Array.isArray(value)) return value.map(sortValue)
  if (!isPlainObject(value)) return value
  const output = {}
  for (const key of Object.keys(value).sort()) output[key] = sortValue(value[key])
  return output
}
function isPlainObject(value) { return !!value && typeof value === "object" && !Array.isArray(value) }
function toHarnessRelative(root, fp) { return path.win32.join("openhermes", path.relative(root, fp)) }
function normalizeStringArray(value) {
  if (!Array.isArray(value)) return []
  return value.filter(item => typeof item === "string").map(s => s.trim()).filter(Boolean)
}

async function readJson(fp, fallback) {
  try { return JSON.parse(await fs.readFile(fp, "utf8")) } catch (e) { if (e?.code === "ENOENT") return fallback; throw e }
}

async function readJsonl(fp) {
  try {
    const text = await fs.readFile(fp, "utf8")
    return text.split(/\r?\n/).map(l => l.trim()).filter(Boolean).map(l => JSON.parse(l))
  } catch (e) { if (e?.code === "ENOENT") return []; throw e }
}

async function writeJson(fp, value) { await writeTextAtomic(fp, `${stableStringify(value, 2)}\n`) }

async function writeTextAtomic(fp, text) {
  const dir = path.dirname(fp)
  const tmp = path.join(dir, `.${path.basename(fp)}.${process.pid}.${Date.now()}.tmp`)
  await fs.mkdir(dir, { recursive: true })
  await fs.writeFile(tmp, text, "utf8")
  await replaceFile(tmp, fp)
}

async function replaceFile(tmp, fp) {
  try { await fs.rename(tmp, fp); return } catch (e) { if (e?.code !== "EEXIST" && e?.code !== "EPERM") { await fs.unlink(tmp).catch(() => {}); throw e } }
  const bak = path.join(path.dirname(fp), `.${path.basename(fp)}.${process.pid}.${Date.now()}.bak`)
  try { await fs.rename(fp, bak) } catch (e) { if (e?.code === "ENOENT") { await fs.rename(tmp, fp); return } await fs.unlink(tmp).catch(() => {}); throw e }
  try { await fs.rename(tmp, fp); await fs.unlink(bak) } catch (e) { await fs.rename(bak, fp).catch(() => {}); await fs.unlink(tmp).catch(() => {}); throw e }
}

async function listObjectFiles(dir) {
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true })
    return entries.filter(e => e.isFile() && e.name.endsWith(".json") && e.name !== "index.json").map(e => e.name)
  } catch (e) { if (e?.code === "ENOENT") return []; throw e }
}

function buildIndexEntry(cls, record) {
  const entry = { id: record.id, summary: record.summary, status: record.status, updated_at: record.updated_at ?? record.created_at, path: path.win32.join("openhermes", "memory", PLURALS[cls], `${record.id}.json`), scope: record.scope ?? null, project: record.project ?? null }
  if (cls === "audit") { entry.target = record.target; entry.overall_score = record.overall_score }
  if (cls === "backlog") { entry.priority = record.priority; entry.trigger = record.trigger }
  if (record.signal !== undefined) entry.signal = record.signal
  return entry
}

function sortRecent(entries) { return [...entries].sort((a, b) => compareTimestamps(timestampOf(b), timestampOf(a))) }
function timestampOf(e) { return e?.updated_at ?? e?.created_at ?? "" }
function compareTimestamps(a, b) {
  const at = Date.parse(a), bt = Date.parse(b)
  if (!Number.isNaN(at) && !Number.isNaN(bt) && at !== bt) return at - bt
  return String(a).localeCompare(String(b))
}

function isExpired(record) {
  if (record?.status === "expired" || record?.status === "decayed") return true
  if (record?.decay_at && Date.parse(record.decay_at) < Date.now()) return true
  if (record?.expires_at && Date.parse(record.expires_at) < Date.now()) return true
  return false
}

function filterActive(entries) {
  return entries.filter(e => !isExpired(e))
}

async function writeObjectRecord(root, cls, record) {
  const dir = classDir(root, cls)
  const fp = path.join(dir, `${record.id}.json`)
  const indexPath = path.join(dir, "index.json")
  const index = await readJson(indexPath, [])
  const entry = buildIndexEntry(cls, record)
  const next = Array.isArray(index) ? [...index] : []
  const existing = next.findIndex(e => e?.id === record.id)
  if (existing >= 0) next[existing] = entry; else next.push(entry)
  await writeJson(fp, record)
  await writeJson(indexPath, next)
  return { path: toHarnessRelative(root, fp), indexPath: toHarnessRelative(root, indexPath), updated: existing >= 0 }
}

async function upsertMistake(root, record) {
  const dir = classDir(root, "mistake")
  const fp = path.join(dir, "mistakes.jsonl")
  const entries = await readJsonl(fp)
  const next = [...entries]
  const existing = next.findIndex(e => e?.id === record.id)
  if (existing >= 0) next[existing] = record; else next.push(record)
  const lines = next.map(e => stableStringify(e)).join("\n")
  await writeTextAtomic(fp, lines ? `${lines}\n` : "")
  return { path: toHarnessRelative(root, fp), updated: existing >= 0 }
}

async function queryList(root, cls, limit = 10) {
  if (cls === "mistake") {
    const entries = await readJsonl(path.join(classDir(root, cls), "mistakes.jsonl"))
    return sortRecent(filterActive(entries)).slice(0, limit)
  }
  const dir = classDir(root, cls)
  const files = await listObjectFiles(dir)
  const entries = (await Promise.all(files.map(async f => {
    const r = await readJson(path.join(dir, f), null)
    return r ? buildIndexEntry(cls, r) : null
  }))).filter(Boolean)
  return sortRecent(filterActive(entries)).slice(0, limit)
}

async function queryGet(root, cls, id) {
  if (cls === "mistake") {
    const entries = await readJsonl(path.join(classDir(root, cls), "mistakes.jsonl"))
    return entries.find(e => e?.id === id) ?? null
  }
  return readJson(path.join(classDir(root, cls), `${id}.json`), null)
}

function scoreRelevance(record, query, project) {
  const q = query.toLowerCase()
  let score = 0
  const searchFields = [
    record.summary, record.id, record.description, record.result_detail,
    record.mission, record.current_state,
    record.failure, record.root_cause, record.fix, record.prevention,
    record.command, record.project, record.scope,
    ...(Array.isArray(record.tags) ? record.tags : []),
    ...(Array.isArray(record.next_actions) ? record.next_actions : []),
    ...(Array.isArray(record.refs) ? record.refs : []),
  ].filter(Boolean)
  for (const field of searchFields) {
    const f = typeof field === "string" ? field.toLowerCase() : String(field).toLowerCase()
    let idx = 0; let count = 0
    while ((idx = f.indexOf(q, idx)) !== -1) { count++; idx += q.length }
    score += count * 10
    if (f.startsWith(q)) score += 5
    if (f.includes(q)) score += 2
  }
  if (record.project && record.project.toLowerCase() === (project || "").toLowerCase()) score += 20
  if (record.project && project && record.project.toLowerCase().includes(project.toLowerCase())) score += 10
  if (record.signal === "high") score += 5
  if (record.signal === "medium") score += 3
  const age = Date.now() - Date.parse(record.updated_at || record.created_at || 0)
  if (!Number.isNaN(age)) score += Math.max(0, 10 - age / (7 * 86400000))
  if (record.status === "active") score += 3
  if (record.status === "closed") score -= 2
  return score
}

async function handleSearch(root, args) {
  const query = (args.query || "").trim()
  if (!query) return { isError: true, content: [{ type: "text", text: "non-blank query is required" }] }
  const classes = Array.isArray(args.classes) && args.classes.length ? args.classes : CLASSES
  const scope = args.scope || "auto"
  const project = args.project || ""
  const limit = Math.min(args.limit ?? 10, 50)
  let records = []
  for (const cls of classes) {
    if (cls === "mistake") {
      const mistakes = await readJsonl(path.join(classDir(root, cls), "mistakes.jsonl"))
      for (const m of mistakes) {
        if (!isExpired(m)) records.push(m)
      }
    } else {
      const dir = classDir(root, cls)
      const files = await listObjectFiles(dir)
      for (const f of files) {
        const r = await readJson(path.join(dir, f), null)
        if (r && !isExpired(r)) records.push(r)
      }
    }
  }
  if (scope === "global") records = records.filter(r => r.scope === "global" || !r.scope)
  else if (scope === "local") records = records.filter(r => r.scope === "project" || r.scope === "session")
  const scored = records.map(r => ({ ...buildIndexEntry(r.class || "verification_receipt", r), score: scoreRelevance(r, query, project) }))
    .filter(e => e.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
  return { content: [{ type: "text", text: stableStringify({ ok: true, count: scored.length, query, results: scored, root }) }] }
}

async function queryLatest(root, cls) {
  const list = await queryList(root, cls, 100)
  const active = list.filter(e => !isExpired(e))
  if (!active[0]?.id) return null
  return queryGet(root, cls, active[0].id)
}

function enforceAuditEvidence(record, errors) {
  const prov = isPlainObject(record.provenance) ? record.provenance : {}
  const has = ["db_refs", "file_refs", "log_refs"].some(k => Array.isArray(prov[k]) && prov[k].some(i => typeof i === "string" && i.trim()))
  if (!has) errors.push("$.provenance must include at least one non-empty evidence ref")
}

async function handlePut(root, args) {
  const { id, class: cls } = args
  let parsed
  try { parsed = JSON.parse(args.data) } catch (e) { return { isError: true, content: [{ type: "text", text: `data must be valid JSON: ${e.message}` }] } }
  if (!isPlainObject(parsed)) return { isError: true, content: [{ type: "text", text: "data must be a JSON object" }] }
  const now = new Date().toISOString()
  const record = {
    ...parsed,
    id, class: cls,
    source: parsed.source ?? "agent",
    status: parsed.status ?? "active",
    created_at: parsed.created_at ?? now,
    updated_at: parsed.updated_at ?? now,
  }
  if (!id?.trim()) return { isError: true, content: [{ type: "text", text: "non-blank id is required" }] }
  const schema = await readJson(path.join(PACKAGE_SCHEMAS_DIR, `${cls}.schema.json`), null)
  if (schema) {
    const unsupported = findUnsupportedSchemaKeywords(schema)
    if (unsupported.length) return { isError: true, content: [{ type: "text", text: `Unsupported schema keywords: ${unsupported.join(", ")}` }] }
    const errs = validateSchema(schema, record, "$")
    if (cls === "audit") enforceAuditEvidence(record, errs)
    if (errs.length) return { isError: true, content: [{ type: "text", text: `Validation errors: ${errs.join("; ")}` }] }
  }
  await fs.mkdir(classDir(root, cls), { recursive: true })
  if (cls === "mistake") {
    const result = await upsertMistake(root, record)
    return { content: [{ type: "text", text: stableStringify({ ok: true, id, path: result.path, updated: result.updated, root }) }] }
  }
  const result = await writeObjectRecord(root, cls, record)
  return { content: [{ type: "text", text: stableStringify({ ok: true, id, path: result.path, updated: result.updated, root }) }] }
}

async function handleGet(root, args) {
  if (!args.id?.trim()) return { isError: true, content: [{ type: "text", text: "non-blank id is required" }] }
  const record = await queryGet(root, args.class, args.id.trim())
  if (!record) return { content: [{ type: "text", text: stableStringify({ ok: false, found: false, root }) }] }
  return { content: [{ type: "text", text: stableStringify({ ok: true, record, root }) }] }
}

async function handleList(root, args) {
  const entries = await queryList(root, args.class, args.limit ?? 10)
  return { content: [{ type: "text", text: stableStringify({ ok: true, count: entries.length, entries, root }) }] }
}

async function handleLatest(root, args) {
  const record = await queryLatest(root, args.class)
  return { content: [{ type: "text", text: stableStringify({ ok: !!record, record, root }) }] }
}

// ---- MCP stdio protocol ----
let initialized = false
let requestId = 0

function sendMsg(msg) {
  process.stdout.write(JSON.stringify(msg) + "\n")
}

function sendError(id, code, message) {
  sendMsg({ jsonrpc: "2.0", id, error: { code, message } })
}

function sendResult(id, result) {
  sendMsg({ jsonrpc: "2.0", id, result })
}

function sendNotification(method, params) {
  sendMsg({ jsonrpc: "2.0", method, params })
}

async function handleRequest(msg) {
  const { id, method, params } = msg

  if (method === "initialize") {
    initialized = true
    sendResult(id, {
      protocolVersion: params?.protocolVersion ?? "2024-11-05",
      capabilities: { tools: {} },
      serverInfo: SERVER_INFO,
    })
    return
  }

  if (method === "notifications/initialized") {
    return
  }

  if (!initialized) {
    sendError(id, -32000, "Server not initialized")
    return
  }

  if (method === "tools/list") {
    sendResult(id, { tools: TOOLS })
    return
  }

  if (method === "tools/call") {
    const toolName = params?.name
    const toolArgs = params?.arguments ?? {}

    if (!toolName) {
      sendError(id, -32602, "Tool name is required")
      return
    }

    const root = await getHarnessRoot()

    try {
      let result
      switch (toolName) {
        case "hm_put": result = await handlePut(root, toolArgs); break
        case "hm_get": result = await handleGet(root, toolArgs); break
        case "hm_list": result = await handleList(root, toolArgs); break
        case "hm_latest": result = await handleLatest(root, toolArgs); break
        case "hm_search": result = await handleSearch(root, toolArgs); break
        default: sendError(id, -32601, `Unknown tool: ${toolName}`); return
      }
      sendResult(id, result)
    } catch (e) {
      sendError(id, -32603, e.message)
    }
    return
  }

  if (method === "ping") {
    sendResult(id, {})
    return
  }

  sendError(id, -32601, `Unknown method: ${method}`)
}

process.stdin.setEncoding("utf8")
process.on("uncaughtException", (e) => { process.stderr.write(`hm-mcp-server UNCAUGHT: ${e.stack}\n`) })
process.on("unhandledRejection", (e) => { process.stderr.write(`hm-mcp-server UNHANDLED: ${e.stack}\n`) })
let buffer = ""
process.stdin.on("data", (chunk) => {
  buffer += chunk
  const lines = buffer.split("\n")
  buffer = lines.pop()
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) continue
    try {
      const msg = JSON.parse(trimmed)
      handleRequest(msg).catch(e => {
        if (msg.id !== undefined) sendError(msg.id, -32603, e.message)
      })
    } catch (e) {
      // malformed JSON, can't respond without id
      process.stderr.write(`Failed to parse message: ${e.message}\n`)
    }
  }
})

process.stdin.on("end", () => process.exit(0))
