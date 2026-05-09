import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"
import { homedir } from "node:os"

const NAME = "ohc-pruner"
const NUDGE_PREFIX = "\n\n[OpenHermes"

const DEFAULTS = {
  enabled: true,
  maxContext: 100000,
  minContext: 50000,
  nudgeFrequency: 5,
  iterationThreshold: 15,
  mode: "soft"
}

let _config = null
let _requestCount = 0
let _cwd = null

function loadConfig() {
  const merged = { ...DEFAULTS }

  const globalPath = join(homedir(), ".config", "opencode", "ohc.json")
  if (existsSync(globalPath)) {
    try { Object.assign(merged, JSON.parse(readFileSync(globalPath, "utf8"))) } catch {}
  }

  const cwd = _cwd || process.cwd()
  const projectPath = join(cwd, ".opencode", "ohc.json")
  if (existsSync(projectPath)) {
    try { Object.assign(merged, JSON.parse(readFileSync(projectPath, "utf8"))) } catch {}
  }

  return merged
}

function isNudgeText(text) {
  return typeof text === "string" && text.startsWith(NUDGE_PREFIX)
}

function estimateTokens(text) {
  if (typeof text !== "string") return 0
  return Math.ceil(text.length / 4)
}

function messageTokens(msg) {
  let n = 0
  if (!Array.isArray(msg?.parts)) return 0
  for (const p of msg.parts) {
    if (isNudgeText(p?.text)) continue
    n += estimateTokens(p?.text || JSON.stringify(p))
  }
  return n + 4
}

function totalTokens(messages) {
  let n = 0
  for (const msg of messages) { n += messageTokens(msg) }
  return n
}

function sinceLastUser(messages) {
  let n = 0
  for (let i = messages.length - 1; i >= 0; i--) {
    const role = messages[i]?.info?.role
    if (!role) { n++; continue }
    if (role === "user") break
    n++
  }
  return n
}

function isUserTurn(messages) {
  if (messages.length === 0) return false
  return messages[messages.length - 1]?.info?.role === "user"
}

function formatNudge(tokens, max, mode) {
  const pct = Math.round((tokens / max) * 100)
  const urgency = pct > 140 ? "CRITICAL" : pct > 100 ? "HIGH" : pct > 70 ? "MODERATE" : "LOW"

  return [
    `[OpenHermes — ${mode === "strong" ? "STRONG Compaction Required" : `Context Pressure: ${urgency}`}]`,
    ``,
    `Token estimate: ~${tokens.toLocaleString()} (${pct}% of ${max.toLocaleString()} limit).`,
    mode === "strong"
      ? `Strong mode active. Run \`compress\` before any substantive response.`
      : `Run \`compress\` on closed, stale, or dead-end conversation segments when convenient.`,
    `Use range mode: \`startId\` + \`endId\` + comprehensive summary.`,
    `Prefer: oldest closed topics, large tool outputs, exhausted exploration branches.`,
    `After compaction, summaries are your authoritative reference. Resume normally.`,
  ].join("\n")
}

function pruneDedup(messages) {
  const seen = new Map()

  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i]
    if (!msg || msg.info?.role !== "assistant") continue
    if (!Array.isArray(msg.parts)) continue

    for (const p of msg.parts) {
      if (p?.type === "tool_use" && !p.error) {
        const key = `${p.name}::${JSON.stringify(p.input || {})}`
        if (seen.has(key)) {
          p._deduped = true
        } else {
          seen.set(key, true)
        }
      }
    }
  }

  for (const msg of messages) {
    if (!Array.isArray(msg?.parts)) continue
    msg.parts = msg.parts.map(b => {
      if (b?._deduped) {
        delete b._deduped
        return { type: "text", text: `[Content pruned: duplicate tool call — ${b.name}]` }
      }
      return b
    })
  }
}

function pruneErrors(messages) {
  const TURNS = 4
  let turnCount = 0

  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i]
    if (!msg || !msg.info?.role) continue
    if (msg.info.role === "user") turnCount++
    if (turnCount <= TURNS) continue
    if (!Array.isArray(msg.parts)) continue

    for (const p of msg.parts) {
      if (p?.type === "tool_use" && p.error) {
        p.input = "[stripped — errored tool >4 turns old]"
      }
    }
  }
}

export async function OHCPrunerPlugin() {
  return {
    name: NAME,

    config: async (config) => {
      _cwd = config?.project?.directory || process.cwd()
      return config
    },

    "experimental.chat.system.transform": async (input, output) => {
      if (!_config) _config = loadConfig()
      if (!_config.enabled) return

      const limit = input?.model?.limit?.context || _config.maxContext

      output.system = output.system || []
      output.system[output.system.length - 1] += [
        ``,
        `## OpenHermes Context Pruning (${NAME})`,
        `- Mode: ${_config.mode}. Window: ${limit.toLocaleString()} tokens. Soft limits: ${_config.minContext.toLocaleString()} / ${_config.maxContext.toLocaleString()}.`,
        `- When context-pressure messages appear, call the \`compress\` tool.`,
        `- Use range mode: \`startId\` + \`endId\` + a comprehensive technical summary.`,
        `- Target: closed topics, stale tool outputs, dead-end exploration. Never compress active work.`,
      ].join("\n")
    },

    "experimental.chat.messages.transform": async (input, output) => {
      if (!_config) _config = loadConfig()
      if (!_config.enabled) return
      if (!Array.isArray(output.messages)) return

      _requestCount++
      const messages = output.messages

      if (_config.mode === "strong") {
        pruneDedup(messages)
        pruneErrors(messages)
      }

      const tokens = totalTokens(messages)
      const { maxContext, minContext, nudgeFrequency, iterationThreshold, mode } = _config

      let shouldNudge = false

      if (tokens > maxContext && _requestCount % nudgeFrequency === 0) {
        shouldNudge = true
      } else if (tokens > minContext && isUserTurn(messages)) {
        shouldNudge = true
      } else if (sinceLastUser(messages) >= iterationThreshold) {
        shouldNudge = true
      }

      if (shouldNudge) {
        const nudgeText = NUDGE_PREFIX + formatNudge(tokens, maxContext, mode).substring("[OpenHermes".length)

        for (let i = messages.length - 1; i >= 0; i--) {
          const msg = messages[i]
          if (msg?.info?.role === "user" && Array.isArray(msg.parts)) {
            if (msg.parts.some(p => isNudgeText(p?.text))) break
            msg.parts.push({ type: "text", text: nudgeText })
            break
          }
        }
      }
    }
  }
}
