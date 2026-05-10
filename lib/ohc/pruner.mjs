import { tool } from "@opencode-ai/plugin"
import { loadConfig } from "./config.mjs"
import { reap } from "./reaper.mjs"

function estimateTokens(messages) {
  let t = 0
  for (const msg of messages || []) {
    for (const part of msg.parts || []) {
      if (part.type === "text") t += Math.ceil((part.text || "").length / 4)
      else if (part.type === "tool") {
        if (part.state?.input) t += JSON.stringify(part.state.input).length / 4
        if (part.state?.output) t += (typeof part.state.output === "string" ? part.state.output : JSON.stringify(part.state.output ?? "")).length / 4
      }
    }
  }
  return Math.ceil(t)
}

function buildNudge(pct) {
  if (pct > 0.95) return `[OHC] Context critically high (${Math.round(pct * 100)}% of ${max.toLocaleString()} token budget). Oldest messages will be pruned immediately if limit exceeded. Use the \`compress\` tool now.`
  if (pct > 0.85) return `[OHC] Context at ${Math.round(pct * 100)}%. Proactive compression recommended. Run \`compress\` to free space.`
  if (pct > 0.70) return `[OHC] Context at ${Math.round(pct * 100)}% of budget. Consider using \`compress\` to keep room for new content.`
  return null
}

export const OhcPlugin = async (ctx) => {
  const config = loadConfig()
  if (!config.enabled) return {}

  const max = config.max
  const min = config.min
  if (max <= min + 10000) return {}

  const state = { systemInjected: false, lastNudgePct: 0, pendingCompress: null }

  return {
    config: async (opencodeConfig) => {
      opencodeConfig.command ??= {}
      opencodeConfig.command["ohc"] = { template: "", description: "OHC context management: /ohc status, /ohc compress [focus]" }
    },

    "experimental.chat.system.transform": async (_input, output) => {
      if (state.systemInjected || !output.system?.length) return
      state.systemInjected = true
      output.system[output.system.length - 1] += `\n\n## Context Management (OHC)\n- Budget: ${max.toLocaleString()} tokens. Floor: ${min.toLocaleString()}.\n- When usage exceeds budget, oldest messages are automatically pruned down to the floor.\n- Proactive compression preserves information: call \`compress\` with a summary of old content to free space.`
    },

    "experimental.chat.messages.transform": async (_input, output) => {
      if (!output?.messages?.length) return

      if (state.pendingCompress) {
        const summary = state.pendingCompress
        state.pendingCompress = null
        const before = estimateTokens(output.messages)
        const removed = reap(output.messages, max, min)
        const after = estimateTokens(output.messages)
        if (removed) {
          const summaryMsg = { parts: [{ type: "text", text: `[Compressed: ${summary} — freed ~${Math.round((before - after) / 1000)}K tokens, ${removed} messages removed]` }], info: { role: "system" } }
          output.messages.splice(1, 0, summaryMsg)
        }
        return
      }

      reap(output.messages, max, min)

      const pct = estimateTokens(output.messages) / max
      const nudge = buildNudge(pct)
      if (nudge && pct > state.lastNudgePct + 0.05) {
        state.lastNudgePct = pct
        for (let i = output.messages.length - 1; i >= 0; i--) {
          const m = output.messages[i]
          if (m.info?.role === "assistant" && m.parts?.length) {
            const textPart = m.parts.find(p => p.type === "text")
            if (textPart) { textPart.text += "\n\n" + nudge; break }
          }
        }
      }
    },

    "command.execute.before": async (input, output) => {
      if (input.command !== "ohc") return
      const sub = (input.arguments || "").trim().toLowerCase()
      if (sub === "status") {
        const msgs = output.messages || []
        const t = estimateTokens(msgs)
        output.parts.length = 0
        output.parts.push({ type: "text", text: `[OHC Status] ${msgs.length} messages, ~${Math.round(t / 1000)}K / ${max.toLocaleString()} tokens (${Math.round(t / max * 100)}%). Floor: ${min.toLocaleString()}.` })
      } else if (sub.startsWith("compress")) {
        const focus = sub.replace("compress", "").trim()
        state.pendingCompress = focus || "Manual compression by user"
        output.parts.length = 0
        output.parts.push({ type: "text", text: `[OHC] Compression queued with summary: "${focus || "Manual compression by user"}". Will apply on next cycle.` })
      } else {
        output.parts.length = 0
        output.parts.push({ type: "text", text: "OHC commands: /ohc status — /ohc compress [focus description]" })
      }
    },

    tool: {
      compress: tool({
        description: "Proactively compress old conversation content to free context space. Provide a technical summary of what was removed.",
        args: {
          summary: tool.schema.string().describe("Technical summary of the compressed content. Include what was removed and key decisions preserved."),
        },
        async execute(args, toolCtx) {
          state.pendingCompress = args.summary
          toolCtx.metadata({ title: "Compress" })
          return `Compression queued. Summary: "${truncateText(args.summary, 100)}". Will apply on next message cycle. Oldest messages will be replaced with this summary, freeing context space.`
        },
      }),
    },
  }
}

function truncateText(s, n) {
  if (!s || s.length <= n) return s || ""
  return s.slice(0, n) + "..."
}
