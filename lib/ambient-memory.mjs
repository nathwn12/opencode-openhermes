import { hasExpired } from "./hardening.mjs"
import { getStore } from "./memory-store.mjs"
import { scoreRelevance } from "./search.mjs"
import { createLogger } from "./logger.mjs"

const log = createLogger("ambient-memory")
let _ambientInjecting = false

function truncateText(text, limit = 12000) {
  const value = String(text ?? "")
  if (limit <= 0 || value.length <= limit) return value
  return value.slice(0, Math.max(0, limit - 14)) + "...[truncated]"
}
// v4 core record classes; keeps old class names for backward-compat reads
const CLASSES = ["checkpoint", "mistake", "decision", "audit", "constraint", "backlog", "verification_receipt"]

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

function filterActive(entries) { return entries.filter(e => !hasExpired(e)) }

function detectMemoryQuery(text) {
  return MEMORY_QUERY_PATTERNS.some(p => p.test(text))
}

function extractSearchTerms(text) {
  const cleaned = text.replace(/<[^>]+>/g, "").replace(/[^\w\s-]/g, " ").trim()
  return cleaned.slice(0, 200)
}

function readAllRecords() {
  const records = []
  for (const cls of CLASSES) {
    const all = getStore().all(cls)
    for (const r of all) {
      if (!hasExpired(r)) records.push({ ...r, _cls: cls })
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

  const latestCp = getStore().latest("checkpoint")
  if (latestCp) {
    parts.push(`Checkpoint: ${latestCp.summary || "N/A"}`)
    if (latestCp.mission) parts.push(`Mission: ${truncateText(latestCp.mission, 200)}`)
    if (Array.isArray(latestCp.next_actions) && latestCp.next_actions.length) parts.push(`Next: ${latestCp.next_actions.slice(0, 2).join("; ")}`)
  }

  const allConstraints = getStore().all("constraint")
  const activeConstraints = allConstraints.filter(e => e.status === "active")
  if (activeConstraints.length) parts.push(`Constraints (${activeConstraints.length} active)`)

  const allDecisions = getStore().all("decision")
  const recent = filterActive(allDecisions).slice(0, 2)
  if (recent.length) parts.push(`Recent decisions: ${recent.map(d => truncateText(d.summary || "", 80)).join(" | ")}`)

  const allBacklog = getStore().all("backlog")
  const open = allBacklog.filter(e => e.status === "open")
  if (open.length) parts.push(`Backlog: ${open.length} open`)

  return parts.length ? parts.join("\n") : "No active memory records found."
}

export const AmbientMemoryPlugin = async () => ({
  "chat.message": async (_input, output) => {
    try {
      const textParts = output.parts?.filter(p => p.type === "text")
      if (!textParts?.length) return

      const hasMemoryTag = textParts.some(p => p.text?.includes("OPENHERMES_MEMORY"))
      if (hasMemoryTag) return

      const block = buildMemoryBlock()
      const tag = `<OPENHERMES_MEMORY>\n${block}\n</OPENHERMES_MEMORY>`
      const textPart = textParts.find(p => !p.text?.includes("OPENHERMES_V4")) || textParts[0]
      if (textPart) {
        textPart.text = `${tag}\n\n${textPart.text}`
      }
    } catch (err) {
      log.error("chat.message memory error:", err?.message)
    }
  },

  "experimental.chat.messages.transform": async (_input, output) => {
    try {
      if (!output.messages?.length) return

      const firstUser = output.messages.find(m => m.info?.role === "user")
      if (!firstUser?.parts?.length) return

      const hasMemoryTag = firstUser.parts.some(p => p.type === "text" && p.text.includes("OPENHERMES_MEMORY"))
      const hasMemoryContext = output.messages.some(m =>
        m.parts?.some(p => p.type === "text" && p.text.includes("memory-context"))
      )

      if (!hasMemoryTag) {
        const block = buildMemoryBlock()
        const tag = `<OPENHERMES_MEMORY>\n${block}\n</OPENHERMES_MEMORY>`
        const textParts = firstUser.parts.filter(p => p.type === "text")
        const textPart = textParts.find(p => !p.text?.includes("OPENHERMES_V4")) || textParts[0]
        if (textPart) {
          textPart.text = `${tag}\n\n${textPart.text}`
        }
      }

      if (!hasMemoryContext) {
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
        if (idx >= 0 && !_ambientInjecting) {
          _ambientInjecting = true
          try {
            output.messages.splice(idx, 0, {
              parts: [{ type: "text", text: contextBlock }],
              info: { role: "system" },
            })
          } finally {
            _ambientInjecting = false
          }
        }
      }
    } catch (err) {
      log.error("messages transform error:", err?.message)
    }
  },
})
