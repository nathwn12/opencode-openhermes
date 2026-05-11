import { tool } from "@opencode-ai/plugin"
import { loadConfig } from "./config.mjs"
import { selectMessagesToReap, totalTokens } from "./reaper.mjs"
import { loadOhcState, saveOhcState } from "./state.mjs"
import { sendCompressNotification } from "./notify.mjs"

function buildNudge(pct, max) {
  if (pct > 0.95) return `[OHC] Context critically high (${Math.round(pct * 100)}% of ${max.toLocaleString()} token budget). Oldest messages will be pruned immediately if limit exceeded. Use the \`compress\` tool now.`
  if (pct > 0.85) return `[OHC] Context at ${Math.round(pct * 100)}%. Proactive compression recommended. Run \`compress\` to free space.`
  if (pct > 0.70) return `[OHC] Context at ${Math.round(pct * 100)}% of budget. Consider using \`compress\` to keep room for new content.`
  return null
}

function summarizeRemoved(selected, summary) {
  const n = selected.length
  if (summary) return `[Compressed: ${summary} — ${n} message${n === 1 ? "" : "s"} removed]`
  return `[Auto-pruned: ${n} message${n === 1 ? "" : "s"} removed]`
}

function createSummaryMessage(text) {
  return { parts: [{ type: "text", text }], info: { role: "system" } }
}

async function applyCompress(ctx, sessionId, summary, max, min, targetTokens) {
  const ss = getOrCreateState(sessionId)
  ss.prunedIds.clear()

  const res = await ctx.client.session.messages({ path: { id: sessionId } })
  const msgs = res?.data || res || []
  if (!Array.isArray(msgs)) return { removed: 0, message: "no messages" }

  const selected = selectMessagesToReap(msgs, max, min, "compress", targetTokens)
  if (selected.length === 0) return { removed: 0, message: "already within target" }

  for (const r of selected) ss.prunedIds.add(r.id)
  ss.summary = summarizeRemoved(selected, summary)
  ss.anchorMessageId = selected[0].id
  saveOhcState(sessionId, {
    prunedMessageIds: [...ss.prunedIds],
    summary: ss.summary,
    anchorMessageId: ss.anchorMessageId,
  })

  const tokensRemoved = selected.reduce((s, r) => s + r.tokens, 0)
  const beforeTotal = totalTokens(msgs)
  const afterTotal = beforeTotal - tokensRemoved
  ss.blockCount++
  ss.totalTokensSaved += tokensRemoved
  return { removed: selected.length, afterTotal, tokensRemoved, beforeTotal, beforeCount: msgs.length, afterCount: msgs.length - selected.length }
}

const AUTOPRUNE_COOLDOWN = 10000

const stateCache = new Map()

function getOrCreateState(sessionId) {
  if (!sessionId) return null
  let s = stateCache.get(sessionId)
  if (!s) {
    const persisted = loadOhcState(sessionId)
    s = {
      prunedIds: new Set(persisted?.prunedMessageIds || []),
      summary: persisted?.summary || null,
      anchorMessageId: persisted?.anchorMessageId || null,
      lastNudgePct: 0,
      totalTokensSaved: 0,
      blockCount: 0,
      lastAutoPruneAt: null,
    }
    stateCache.set(sessionId, s)
  }
  return s
}

export const OhcPlugin = async (ctx) => {
  const config = loadConfig()
  if (!config.enabled) return {}

  const max = config.max
  const min = config.min
  if (max <= min + 10000) return {}

  let systemInjected = false

  return {
    "experimental.chat.system.transform": async (_input, output) => {
      if (systemInjected || !output.system?.length) return
      systemInjected = true
      output.system[output.system.length - 1] += `\n\n## Context Management (OHC)\n- OHC manages all compression. Set \`compaction.auto: false\` in opencode.json to prevent double pruning.\n- Default soft budget: ${max.toLocaleString()} tokens. Soft floor: ${min.toLocaleString()}.\n- These are advisory — the agent can override by passing \`targetTokens\` to the \`compress\` tool.\n- Call \`compress\` with a summary to free context space. Optionally specify \`targetTokens\` (lower = more aggressive).`
    },

    "experimental.chat.messages.transform": async (_input, output) => {
      if (!output?.messages?.length) return

      const sessionId = output.messages.find(m => m.info?.sessionID)?.info?.sessionID
      if (!sessionId) return

      const ss = getOrCreateState(sessionId)
      if (!ss) return

      const now = Date.now()
      const recentlyPruned = ss.lastAutoPruneAt && (now - ss.lastAutoPruneAt) < AUTOPRUNE_COOLDOWN

      if (ss.prunedIds.size > 0 && !recentlyPruned) {
        const currentIds = new Set(output.messages.map(m => m.info?.id).filter(Boolean))
        if ([...ss.prunedIds].every(id => !currentIds.has(id))) {
          ss.prunedIds.clear()
          ss.summary = null
          ss.anchorMessageId = null
          ss.lastAutoPruneAt = null
          saveOhcState(sessionId, {
            prunedMessageIds: [],
            summary: null,
            anchorMessageId: null,
          })
        }
      }

      const currentTotal = totalTokens(output.messages)
      if (currentTotal > max && !recentlyPruned) {
        const selected = selectMessagesToReap(output.messages, max, min)
        if (selected.length > 0) {
          for (const r of selected) ss.prunedIds.add(r.id)
          if (!ss.summary) ss.summary = summarizeRemoved(selected, null)
          if (!ss.anchorMessageId) ss.anchorMessageId = selected[0].id
          saveOhcState(sessionId, {
            prunedMessageIds: [...ss.prunedIds],
            summary: ss.summary,
            anchorMessageId: ss.anchorMessageId,
          })
          const tokensRemoved = selected.reduce((s, r) => s + r.tokens, 0)
          const afterTotal = currentTotal - tokensRemoved
          ss.blockCount++
          ss.totalTokensSaved += tokensRemoved
          ss.lastAutoPruneAt = now
          sendCompressNotification(ctx.client, sessionId, config, selected.length, null, tokensRemoved, ss.totalTokensSaved, ss.blockCount, selected.length, output.messages.length - selected.length, true)
        }
      }

      if (ss.prunedIds.size > 0) {
        const prunedIds = ss.prunedIds
        const summary = ss.summary
        const anchorId = ss.anchorMessageId
        const result = []
        let injected = false

        for (const msg of output.messages) {
          const msgId = msg.info?.id

          if (anchorId && msgId === anchorId && !injected && summary) {
            result.push(createSummaryMessage(summary))
            injected = true
          }

          if (msgId !== undefined && prunedIds.has(msgId)) continue

          result.push(msg)
        }

        if (!injected && summary && result.length > 1) {
          result.splice(1, 0, createSummaryMessage(summary))
        }

        output.messages.length = 0
        output.messages.push(...result)
      }

      const afterTotal = totalTokens(output.messages)
      const pct = afterTotal / max
      const nudge = buildNudge(pct, max)
      if (nudge && pct > ss.lastNudgePct + 0.05) {
        ss.lastNudgePct = pct
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
      const args = (input.arguments || "").trim()

      if (sub === "status") {
        let msgs = [], t = 0
        try {
          if (ctx?.client?.session?.messages) {
            const res = await ctx.client.session.messages({ path: { id: input.sessionID } })
            msgs = res?.data || res || []
            t = totalTokens(msgs)
          }
        } catch {}
        const ss = getOrCreateState(input.sessionID)
        const prunedCount = ss?.prunedIds.size || 0
        const text = `[OHC Status] ${msgs.length} messages visible (${prunedCount} pruned), ~${Math.round(t / 1000)}K / ${max.toLocaleString()} tokens (${Math.round((t / max) * 100)}%). Soft floor: ${min.toLocaleString()}.`
        await ctx.client.session.prompt({
          path: { id: input.sessionID },
          body: { noReply: true, parts: [{ type: "text", text, ignored: true }] },
        })
        throw new Error("__OHC_STATUS_HANDLED__")
      }

      if (sub.startsWith("compress")) {
        const rest = args.replace(/^compress\s*/i, "").trim()
        const numMatch = rest.match(/^(\d+)\s*(.*)/)
        let targetTokens
        let focus
        if (numMatch) {
          targetTokens = parseInt(numMatch[1], 10)
          focus = numMatch[2].trim() || "Manual compression by user"
        } else {
          focus = rest || "Manual compression by user"
        }
        try {
          const result = await applyCompress(ctx, input.sessionID, focus, max, min, targetTokens)
          const cmdSs = getOrCreateState(input.sessionID)
          await sendCompressNotification(ctx.client, input.sessionID, config, result.removed, focus, result.tokensRemoved, cmdSs.totalTokensSaved, cmdSs.blockCount, result.removed, result.afterCount, false)
          output.parts.length = 0
          output.parts.push({
            type: "text",
            text: `[OHC] Compressed: ${result.removed} messages removed. Summary: ${focus}`,
          })
        } catch {
          output.parts.length = 0
          output.parts.push({ type: "text", text: `/ohc compress ${focus}` })
        }
        return
      }

      const text = "OHC commands: /ohc status — /ohc compress [targetTokens] [focus description]"
      await ctx.client.session.prompt({
        path: { id: input.sessionID },
        body: { noReply: true, parts: [{ type: "text", text, ignored: true }] },
      })
      throw new Error("__OHC_HELP_HANDLED__")
    },

    tool: {
      compress: tool({
        description: "Proactively compress old conversation content to free context space. Provide a technical summary of what was removed. Optionally specify targetTokens to control how much to keep (lower = more aggressive).",
        args: {
          summary: tool.schema.string().describe("Technical summary of the compressed content. Include what was removed and key decisions preserved."),
          targetTokens: tool.schema.number().optional().describe("Estimated target after compression (heuristic, not exact). Lower = more aggressive. Default uses soft config floor."),
        },
        async execute(args, toolCtx) {
          const result = await applyCompress(ctx, toolCtx.sessionID, args.summary, max, min, args.targetTokens)
          toolCtx.metadata({ title: "Compress" })
          const toolSs = getOrCreateState(toolCtx.sessionID)
          await sendCompressNotification(ctx.client, toolCtx.sessionID, config, result.removed, truncateText(args.summary, 200), result.tokensRemoved, toolSs.totalTokensSaved, toolSs.blockCount, result.removed, result.afterCount, false)
          return `Compressed: ${result.removed} messages removed. Summary: "${truncateText(args.summary, 200)}"`
        },
      }),
    },
  }
}

function truncateText(s, n) {
  if (!s || s.length <= n) return s || ""
  return s.slice(0, n) + "..."
}
