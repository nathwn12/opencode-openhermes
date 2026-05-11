import path from "node:path"
import fs from "node:fs"
import { readJson, readJsonl, truncateText } from "./hardening.mjs"
import { getMemoryRoot, getRecallRoot, getDataRoot } from "./paths.mjs"
import { scoreRelevance } from "./search.mjs"

const PLURALS = { audit: "audits", checkpoint: "checkpoints", mistake: "mistakes", instinct: "instincts", decision: "decisions", constraint: "constraints", backlog: "backlog", verification_receipt: "verification_receipts" }
const CLASSES = ["audit", "checkpoint", "mistake", "instinct", "decision", "constraint", "backlog", "verification_receipt"]

const MEMORY_QUERY_PATTERNS = [
  /where\s+(did|do)\s+we\s+(leave\s+off|left\s+off)/i,
  /where\s+were\s+we/i,
  /what\s+(was|is)\s+(the\s+)?(last|latest|most\s+recent)\s+(checkpoint|decision|constraint|feature|task|change|issue|fix|bug|request|request)/i,
  /remind\s+me\s+(about|of)/i,
  /what\s+were\s+we\s+(working\s+on|doing)/i,
  /what\s+(happened|changed)\s+(last|yesterday|before|previously)/i,
  /previous\s+session/i,
  /last\s+time/i,
  /recap/i,
  /what\s+is\s+(the\s+)?(status|state)\s+of/i,
  /did\s+we\s+(decide|agree|finish|resolve|discuss)/i,
  /where\s+(did|do)\s+i\s+(leave\s+off|left\s+off)/i,
]

function hasExpired(r) {
  if (r?.status === "expired" || r?.status === "decayed") return true
  if (r?.decay_at && Date.parse(r.decay_at) < Date.now()) return true
  if (r?.expires_at && Date.parse(r.expires_at) < Date.now()) return true
  return false
}

function filterActive(entries) { return entries.filter(e => !hasExpired(e)) }

function detectMemoryQuery(text) {
  return MEMORY_QUERY_PATTERNS.some(p => p.test(text))
}

function extractSearchTerms(text) {
  const cleaned = text.replace(/<[^>]+>/g, "").replace(/[^\w\s-]/g, " ").trim()
  return cleaned.slice(0, 200)
}

function classDir(cls) { return path.join(getMemoryRoot(), PLURALS[cls]) }

function readAllRecords() {
  const records = []
  for (const cls of CLASSES) {
    if (cls === "mistake") {
      for (const m of readJsonl(path.join(classDir(cls), "mistakes.jsonl"))) {
        if (!hasExpired(m)) records.push({ ...m, _cls: cls })
      }
    } else {
      const dir = classDir(cls)
      const index = readJson(path.join(dir, "index.json"), [])
      if (!Array.isArray(index)) continue
      for (const entry of index) {
        if (!hasExpired(entry)) {
          records.push({ ...entry, _cls: cls })
        }
      }
    }
  }
  return records
}

function autoSearch(query) {
  const q = (query || "").trim()
  if (!q) return []

  const records = readAllRecords()
  const scored = records
    .map(r => ({ ...r, _score: scoreRelevance(r, q, "") }))
    .filter(r => r._score > 0)
    .sort((a, b) => b._score - a._score)
    .slice(0, 5)

  return scored
}

function buildMemoryBlock() {
  const parts = []

  const ckIndex = readJson(path.join(getMemoryRoot(), "checkpoints", "index.json"), [])
  if (Array.isArray(ckIndex) && ckIndex.length > 0) {
    const latest = [...ckIndex].sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))[0]
    if (latest) {
      const cp = readJson(path.join(getMemoryRoot(), "checkpoints", `${latest.id}.json`), null)
      if (cp) {
        parts.push(`Checkpoint: ${cp.summary || "N/A"}`)
        if (cp.mission) parts.push(`Mission: ${truncateText(cp.mission, 200)}`)
        if (Array.isArray(cp.next_actions) && cp.next_actions.length) parts.push(`Next: ${cp.next_actions.slice(0, 2).join("; ")}`)
      }
    }
  }

  const ctIndex = readJson(path.join(getMemoryRoot(), "constraints", "index.json"), [])
  if (Array.isArray(ctIndex)) {
    const active = ctIndex.filter(e => e.status === "active")
    if (active.length) parts.push(`Constraints (${active.length} active)`)
  }

  const dcIndex = readJson(path.join(getMemoryRoot(), "decisions", "index.json"), [])
  if (Array.isArray(dcIndex)) {
    const recent = filterActive(dcIndex).slice(0, 2)
    if (recent.length) parts.push(`Recent decisions: ${recent.map(d => truncateText(d.summary || "", 80)).join(" | ")}`)
  }

  const bkIndex = readJson(path.join(getMemoryRoot(), "backlog", "index.json"), [])
  if (Array.isArray(bkIndex)) {
    const open = bkIndex.filter(e => e.status === "open")
    if (open.length) parts.push(`Backlog: ${open.length} open`)
  }

  return parts.length ? parts.join("\n") : "No active memory records found."
}

export const AmbientMemoryPlugin = async () => ({
  "experimental.chat.messages.transform": async (_input, output) => {
    if (!output.messages?.length) return

    const firstUser = output.messages.find(m => m.info?.role === "user")
    if (!firstUser?.parts?.length) return

    const hasMemoryTag = firstUser.parts.some(p => p.type === "text" && p.text.includes("OPENHERMES_MEMORY"))

    if (!hasMemoryTag) {
      const block = buildMemoryBlock()
      const tag = `<OPENHERMES_MEMORY>\n${block}\n</OPENHERMES_MEMORY>`
      const textPart = firstUser.parts.find(p => p.type === "text")
      if (textPart) {
        textPart.text = `${tag}\n\n${textPart.text}`
      }
    }

    const lastUser = [...output.messages].reverse().find(m => m.info?.role === "user")
    if (!lastUser) return

    const text = lastUser.parts?.find(p => p.type === "text")?.text || ""
    if (!text || !detectMemoryQuery(text)) return

    const terms = extractSearchTerms(text)
    if (!terms) return

    const results = autoSearch(terms)
    if (!results.length) return

    const contextBlock = [
      `<memory-context>`,
      `[System note: auto-retrieved from durable memory — NOT new user input]`,
      ...results.slice(0, 3).map(r => {
        const cls = r.class || "?";
        const label = `${cls}:${r.id}`
        return `- ${label}: ${truncateText(r.summary || "", 120)}`
      }),
      results.length > 3 ? `  ... and ${results.length - 3} more results` : null,
      `</memory-context>`,
    ].filter(Boolean).join("\n")

    const idx = output.messages.indexOf(lastUser)
    if (idx > 0) {
      output.messages.splice(idx, 0, {
        parts: [{ type: "text", text: contextBlock }],
        info: { role: "system" },
      })
    }
  }
})
