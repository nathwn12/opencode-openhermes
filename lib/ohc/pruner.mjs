import { tool } from "@opencode-ai/plugin"
import { loadConfig } from "./config.mjs"
import { selectMessagesToReap, totalTokens } from "./reaper.mjs"
import {
  loadOhcState, saveOhcState, createSessionState,
  serializeState, deserializeState,
  buildToolIdList, syncToolCache, countTurns,
} from "./state.mjs"
import { sendCompressNotification } from "./notify.mjs"
import { deduplicate, purgeErrors } from "./strategies/index.mjs"
import { applyPruneTools, filterCompressedBlocks } from "./prune-apply.mjs"
import { assignMessageRefs, injectMessageIds } from "./message-ids.mjs"
import { syncCompressionBlocks } from "./block-sync.mjs"
import { buildSearchContext, resolveBoundaryIds, resolveSelection, resolveAnchorMessageId, validateNonOverlapping } from "./compress/search.mjs"
import { allocateBlockId, allocateRunId, wrapBlockSummary, applyCompressionState } from "./compress/state.mjs"

const AUTOPRUNE_COOLDOWN = 10000
const stateCache = new Map()

function getOrCreateState(sessionId) {
  if (!sessionId) return null
  let s = stateCache.get(sessionId)
  if (!s) {
    const persisted = loadOhcState(sessionId)
    s = deserializeState(persisted)
    s.sessionId = sessionId
    stateCache.set(sessionId, s)
  }
  return s
}

function getSessionId(messages) {
  if (!messages?.length) return null
  for (const m of messages) {
    if (m.info?.sessionID) return m.info.sessionID
  }
  return null
}

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
  if (ss) {
    ss.prunedIds.clear()
    ss.summary = null
    ss.anchorMessageId = null
    ss._pruneCycleDone = false
    ss.lastAutoPruneAt = null
  }

  const res = await ctx.client.session.messages({ path: { id: sessionId } })
  const msgs = res?.data || res || []
  if (!Array.isArray(msgs)) return { removed: 0, message: "no messages" }

  const selected = selectMessagesToReap(msgs, max, min, "compress", targetTokens)
  if (selected.length === 0) return { removed: 0, message: "already within target" }

  if (ss) {
    for (const r of selected) ss.prunedIds.add(r.id)
    ss.summary = summarizeRemoved(selected, summary)
    ss.anchorMessageId = selected[0].id
    saveOhcState(sessionId, serializeState(ss))
  }

  const tokensRemoved = selected.reduce((s, r) => s + r.tokens, 0)
  const beforeTotal = totalTokens(msgs)
  const afterTotal = beforeTotal - tokensRemoved
  if (ss) {
    ss.blockCount++
    ss.totalTokensSaved += tokensRemoved
  }
  return { removed: selected.length, afterTotal, tokensRemoved, beforeTotal, beforeCount: msgs.length, afterCount: msgs.length - selected.length }
}

function truncateText(s, n) {
  if (!s || s.length <= n) return s || ""
  return s.slice(0, n) + "..."
}

function estimateSummaryTokens(messages) {
  let total = 0
  for (const m of messages) {
    if (m.info?.role === "system" && Array.isArray(m.parts)) {
      for (const p of m.parts) {
        if (p.type === "text" && p.text?.startsWith("[Compressed:") || p.text?.startsWith("[Auto-pruned:")) {
          total += Math.ceil(p.text.length / 4)
        }
      }
    }
  }
  return total
}

async function executeRangeCompress(ctx, sessionId, callId, topic, content) {
  const ss = getOrCreateState(sessionId)
  if (!ss) throw new Error("No session state")
  ss.prunedIds.clear()
  ss.summary = null
  ss.anchorMessageId = null
  ss._pruneCycleDone = false
  ss.lastAutoPruneAt = null

  const res = await ctx.client.session.messages({ path: { id: sessionId } })
  const rawMessages = res?.data || res || []
  if (!Array.isArray(rawMessages) || rawMessages.length === 0) throw new Error("No messages")

  const searchContext = buildSearchContext(ss, rawMessages)

  const plans = content.map((entry, idx) => {
    const { startReference, endReference } = resolveBoundaryIds(searchContext, ss, entry.startId.trim(), entry.endId.trim())
    const selection = resolveSelection(searchContext, startReference, endReference)
    const anchorMessageId = resolveAnchorMessageId(startReference)
    return { index: idx, entry, selection, anchorMessageId }
  })

  validateNonOverlapping(plans)

  const runId = allocateRunId(ss)
  const notifications = []

  for (const plan of plans) {
    const blockId = allocateBlockId(ss)
    const storedSummary = wrapBlockSummary(blockId, plan.entry.summary)
    const summaryTokens = Math.ceil(storedSummary.length / 4)

    applyCompressionState(
      ss,
      {
        topic,
        batchTopic: topic,
        startId: plan.entry.startId,
        endId: plan.entry.endId,
        mode: "range",
        runId,
        compressMessageId: plan.selection.messageIds[0],
        compressCallId: callId,
        summaryTokens,
      },
      plan.selection,
      plan.anchorMessageId,
      blockId,
      storedSummary,
      plan.selection.requiredBlockIds,
    )

    ss.blockCount++
    ss.totalTokensSaved += summaryTokens

    notifications.push({
      blockId,
      runId,
      summary: plan.entry.summary,
      messageIds: plan.selection.messageIds,
    })
  }

  return {
    messageIds: plans.flatMap(p => p.selection.messageIds),
    compressedTokens: 0,
    summaryRef: content[0]?.summary || topic,
    blockCount: plans.length,
  }
}

export const OhcPlugin = async (ctx) => {
  const config = loadConfig(ctx)
  if (!config.enabled) return {}

  const max = config.max
  const min = config.min
  if (max <= min + 10000) return {}

  let systemInjected = false

  function buildTimingStr(ss) {
    if (!ss?.compressionTiming?.totalDurationMs) return ""
    const last = ss.compressionTiming.lastDurationMs || 0
    const total = ss.compressionTiming.totalDurationMs || 0
    const lastSec = (last / 1000).toFixed(1)
    const totalSec = (total / 1000).toFixed(1)
    return `, last compress ${lastSec}s, total ${totalSec}s`
  }

  function computeRoleBreakdown(messages) {
    const roles = {}
    for (const m of messages) {
      const role = m.info?.role || "unknown"
      if (!roles[role]) roles[role] = { count: 0, tokens: 0 }
      roles[role].count++
      if (Array.isArray(m.parts)) {
        for (const p of m.parts) {
          if (p.type === "text") roles[role].tokens += Math.ceil((p.text || "").length / 4)
          else if (p.type === "tool") {
            if (p.state?.input) roles[role].tokens += JSON.stringify(p.state.input).length / 4
            if (p.state?.output)
              roles[role].tokens += (typeof p.state.output === "string" ? p.state.output : JSON.stringify(p.state.output ?? "")).length / 4
          }
        }
      }
    }
    return roles
  }

  function countIterationsSinceLastUser(messages) {
    let lastUserIdx = -1
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].info?.role === "user") {
        lastUserIdx = i
        break
      }
    }
    if (lastUserIdx === -1) return 0
    return messages.length - 1 - lastUserIdx
  }

  return {
    "experimental.chat.system.transform": async (_input, output) => {
      if (systemInjected || !output.system?.length) return
      systemInjected = true
      const summaryBufNote = config.compress?.summaryBuffer ? ` Summary messages extend the budget.` : ``
      const protectedToolsList = (config.compress?.protectedTools || []).length
        ? ` Protected tools (${(config.compress.protectedTools).join(", ")}) are preserved.`
        : ``
      output.system[output.system.length - 1] += `\n\n## OHC Context Management\n- OHC manages all compression. Set \`compaction.auto: false\` in opencode.json.\n- Default budget: ${max.toLocaleString()} tokens. Floor: ${min.toLocaleString()}.${summaryBufNote}${protectedToolsList}\n\n### Compress Tool\nUse \`compress\` to free context space. Two modes:\n- **Legacy**: \`{ summary }\` — oldest messages first\n- **Range**: \`{ topic, content: [{startId, endId, summary}] }\` — target specific ranges\n  - \`startId\` / \`endId\`: \`ohcNNNN\` (message) or \`bkNN\` (block)\n  - Each message in context has an \`<ohc-ref>\` tag with its ID\n  - Ranges must be non-overlapping in one call\n  - Summary replaces the entire range`
    },

    "experimental.chat.messages.transform": async (_input, output) => {
      if (!output?.messages?.length) return

      const sessionId = getSessionId(output.messages)
      if (!sessionId) return

      const ss = getOrCreateState(sessionId)
      if (!ss) return

      syncToolCache(ss, output.messages)
      buildToolIdList(ss, output.messages)
      ss.currentTurn = countTurns(ss, output.messages)

      assignMessageRefs(ss, output.messages)
      injectMessageIds(ss, output.messages)
      syncCompressionBlocks(ss, output.messages)
      filterCompressedBlocks(ss, output.messages)

      deduplicate(ss, config, output.messages)
      purgeErrors(ss, config, output.messages)
      applyPruneTools(ss, output.messages)

      const now = Date.now()
      const recentlyPruned = ss.lastAutoPruneAt && (now - ss.lastAutoPruneAt) < AUTOPRUNE_COOLDOWN

      if (ss.prunedIds.size > 0 && !recentlyPruned) {
        const currentIds = new Set(output.messages.map(m => m.info?.id).filter(Boolean))
        if ([...ss.prunedIds].every(id => !currentIds.has(id))) {
          ss.prunedIds.clear()
          ss.summary = null
          ss.anchorMessageId = null
          ss._pruneCycleDone = false
          saveOhcState(sessionId, serializeState(ss))
        }
      }

      const currentTotal = totalTokens(output.messages)
      if (currentTotal > max && !recentlyPruned && !ss._pruneCycleDone) {
        const selected = selectMessagesToReap(output.messages, max, min)
        if (selected.length > 0) {
          for (const r of selected) ss.prunedIds.add(r.id)
          if (!ss.summary) ss.summary = summarizeRemoved(selected, null)
          if (!ss.anchorMessageId) ss.anchorMessageId = selected[0].id
          saveOhcState(sessionId, serializeState(ss))
          const tokensRemoved = selected.reduce((s, r) => s + r.tokens, 0)
          ss.blockCount++
          ss.totalTokensSaved += tokensRemoved
          ss.lastAutoPruneAt = now
          ss._pruneCycleDone = true
        }
      }

      if (ss._pruneCycleDone && ss.lastAutoPruneAt && (now - ss.lastAutoPruneAt) > AUTOPRUNE_COOLDOWN) {
        ss._pruneCycleDone = false
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

      const summaryBufferTotal = config.compress?.summaryBuffer
        ? estimateSummaryTokens(output.messages)
        : 0
      const effectiveMax = max + summaryBufferTotal
      const pct = afterTotal / effectiveMax
      const nudge = buildNudge(pct, effectiveMax)

      let nudgeText = null
      if (nudge && pct > ss.lastNudgePct + 0.05) {
        nudgeText = nudge
        ss.lastNudgePct = pct
      }

      const iterationThreshold = config.compress?.iterationNudgeThreshold ?? 15
      const iterCount = countIterationsSinceLastUser(output.messages)
      if (iterCount >= iterationThreshold && iterCount % 5 === 0) {
        const iterNudge = `[OHC] ${iterCount} AI iterations since your last message. Consider summarizing completed work with \`compress\`.`
        if (nudgeText) nudgeText += "\n\n" + iterNudge
        else nudgeText = iterNudge
      }

      const blockRefs = [...(ss.prune?.messages?.activeBlockIds || [])]
        .filter(id => Number.isInteger(id) && id > 0)
        .sort((a, b) => a - b)
        .map(id => `bk${id}`)
      let blockGuidance = null
      if (blockRefs.length > 0) {
        blockGuidance = `<ohc-reminder>\nActive compressed blocks: ${blockRefs.join(", ")}\nUse \`bkNN\` IDs as boundaries when compressing ranges that include previously compressed blocks.\n</ohc-reminder>`
      }

      if (nudgeText || blockGuidance) {
        const appendText = [nudgeText, blockGuidance].filter(Boolean).join("\n\n")
        for (let i = output.messages.length - 1; i >= 0; i--) {
          const m = output.messages[i]
          if (m.info?.role === "assistant" && m.parts?.length) {
            const textPart = m.parts.find(p => p.type === "text")
            if (textPart) { textPart.text += "\n\n" + appendText; break }
          }
        }
      }
    },

    event: async (input) => {
      if (input.event?.type !== "message.part.updated") return
      const part = input.event.properties?.part
      if (part?.type !== "tool" || part.tool !== "compress") return

      const sessionId = input.event.properties?.sessionID
      if (!sessionId) return
      const ss = getOrCreateState(sessionId)
      if (!ss) return

      if (part.state?.status === "pending") {
        if (typeof part.callID !== "string") return
        ss.compressionTiming.starts.set(part.callID, Date.now())
        return
      }

      if (part.state?.status === "completed") {
        if (typeof part.callID !== "string") return
        const start = ss.compressionTiming.starts.get(part.callID)
        if (!start) return
        ss.compressionTiming.starts.delete(part.callID)
        const durationMs = Date.now() - start
        ss.compressionTiming.lastDurationMs = durationMs
        ss.compressionTiming.totalDurationMs = (ss.compressionTiming.totalDurationMs || 0) + durationMs
        saveOhcState(sessionId, serializeState(ss))
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
        const strategyPruned = ss?.prune?.tools?.size || 0
        const timing = buildTimingStr(ss)
        const activeBlockIds = [...(ss?.prune?.messages?.activeBlockIds || [])].filter(id => Number.isInteger(id)).sort((a, b) => a - b)
        const blockLine = activeBlockIds.length ? ` Blocks: bk${activeBlockIds.join(", bk")}.` : ""
        const text = `[OHC Status] ${msgs.length} messages visible (${prunedCount} auto-pruned, ${strategyPruned} strategy-pruned)${blockLine}${timing}. ~${Math.round(t / 1000)}K / ${max.toLocaleString()} tokens (${Math.round((t / max) * 100)}%). Soft floor: ${min.toLocaleString()}.`
        await ctx.client.session.prompt({
          path: { id: input.sessionID },
          body: { noReply: true, parts: [{ type: "text", text, ignored: true }] },
        })
        throw new Error("__OHC_STATUS_HANDLED__")
      }

      if (sub === "stats") {
        const ss = getOrCreateState(input.sessionID)
        const totalSaved = ss?.totalTokensSaved || 0
        const blocks = ss?.blockCount || 0
        const dedupPruned = ss?.prune?.tools?.size || 0
        const autoPruned = ss?.prunedIds?.size || 0
        const timing = buildTimingStr(ss)
        const activeBlockIds = [...(ss?.prune?.messages?.activeBlockIds || [])].filter(id => Number.isInteger(id)).sort((a, b) => a - b)
        const blockLine = activeBlockIds.length ? ` Active: bk${activeBlockIds.join(", bk")}.` : ""
        const text = `[OHC Stats] ${blocks} total compression blocks${blockLine} ~${Math.round(totalSaved / 1000)}K tokens saved${timing}. Auto-pruned: ${autoPruned} messages. Strategy-pruned: ${dedupPruned} calls.`
        await ctx.client.session.prompt({
          path: { id: input.sessionID },
          body: { noReply: true, parts: [{ type: "text", text, ignored: true }] },
        })
        throw new Error("__OHC_STATS_HANDLED__")
      }

      if (sub === "manual") {
        const onOff = args.replace(/^manual\s*/i, "").trim().toLowerCase()
        if (onOff === "on" || onOff === "1" || onOff === "true") {
          const ss = getOrCreateState(input.sessionID)
          if (ss) ss.manualMode = "active"
          await ctx.client.session.prompt({
            path: { id: input.sessionID },
            body: { noReply: true, parts: [{ type: "text", text: "[OHC] Manual mode enabled. Agent will not autonomously compress.", ignored: true }] },
          })
        } else {
          const ss = getOrCreateState(input.sessionID)
          if (ss) ss.manualMode = false
          await ctx.client.session.prompt({
            path: { id: input.sessionID },
            body: { noReply: true, parts: [{ type: "text", text: "[OHC] Manual mode disabled. Agent can compress autonomously.", ignored: true }] },
          })
        }
        throw new Error("__OHC_MANUAL_HANDLED__")
      }

      if (sub.startsWith("compress")) {
        const rest = args.replace(/^compress\s*/i, "").trim()
        const numMatch = rest.match(/^(\d+)\s*(.*)/)
        let targetTokens
        let focus
        if (numMatch) {
          targetTokens = parseInt(numMatch[1], 10)
          focus = numMatch[2].trim() || "Manual compression"
        } else {
          focus = rest || "Manual compression"
        }
        try {
          const result = await applyCompress(ctx, input.sessionID, focus, max, min, targetTokens)
          const cmdSs = getOrCreateState(input.sessionID)
          await sendCompressNotification(ctx.client, input.sessionID, config, result.removed, focus, result.tokensRemoved, cmdSs?.totalTokensSaved || 0, cmdSs?.blockCount || 0, result.removed, result.afterCount)
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

      if (sub === "context") {
        let msgs = [], t = 0
        try {
          if (ctx?.client?.session?.messages) {
            const res = await ctx.client.session.messages({ path: { id: input.sessionID } })
            msgs = res?.data || res || []
            t = totalTokens(msgs)
          }
        } catch {}
        const ss = getOrCreateState(input.sessionID)
        const autoPruned = ss?.prunedIds?.size || 0
        const stratPruned = ss?.prune?.tools?.size || 0
        const totalSaved = ss?.totalTokensSaved || 0
        const blocks = ss?.blockCount || 0
        const visibleTokens = t
        const totalTokensWithPruned = visibleTokens + totalSaved

        const roles = computeRoleBreakdown(msgs)
        const roleLines = []
        for (const [role, info] of Object.entries(roles)) {
          const pct = t > 0 ? Math.round((info.tokens / t) * 100) : 0
          roleLines.push(`${role}: ${info.count} msgs, ~${Math.round(info.tokens / 1000)}K (${pct}%)`)
        }

        const activeBlockIds = [...(ss?.prune?.messages?.activeBlockIds || [])].filter(id => Number.isInteger(id)).sort((a, b) => a - b)
        const blockLine = activeBlockIds.length ? ` Active blocks: bk${activeBlockIds.join(", bk")}.` : ""
        const text = `[OHC Context] ${msgs.length} visible messages (${autoPruned + stratPruned} pruned). Tokens: ~${Math.round(visibleTokens / 1000)}K visible / ~${Math.round(totalTokensWithPruned / 1000)}K total. ${blocks} compression blocks, ~${Math.round(totalSaved / 1000)}K saved. ${blockLine}\n\nBreakdown:\n${roleLines.join("\n")}`
        await ctx.client.session.prompt({
          path: { id: input.sessionID },
          body: { noReply: true, parts: [{ type: "text", text, ignored: true }] },
        })
        throw new Error("__OHC_CONTEXT_HANDLED__")
      }

      if (sub === "sweep") {
        const rest = args.replace(/^sweep\s*/i, "").trim()
        let count = rest ? parseInt(rest, 10) : 10
        if (isNaN(count) || count < 1) count = 10
        const ss = getOrCreateState(input.sessionID)
        const allToolIds = ss?.toolIdList || []
        const unpruned = allToolIds.filter(id => !ss.prune.tools.has(id))
        const toSweep = unpruned.slice(-count)
        let sweptCount = 0
        for (const id of toSweep) {
          const entry = ss.toolParameters.get(id)
          if (entry) {
            ss.prune.tools.set(id, entry.tokenCount || 0)
            sweptCount++
          }
        }
        applyPruneTools(ss, output.messages)
        const text = `[OHC] Swept: ${sweptCount} tool calls pruned.`
        output.parts.length = 0
        output.parts.push({ type: "text", text })
        return
      }

      const text = "OHC commands: /ohc status — /ohc stats — /ohc context — /ohc sweep [n] — /ohc manual [on|off] — /ohc compress [focus]"
      await ctx.client.session.prompt({
        path: { id: input.sessionID },
        body: { noReply: true, parts: [{ type: "text", text, ignored: true }] },
      })
      throw new Error("__OHC_HELP_HANDLED__")
    },

    tool: {
      compress: tool({
        description: "Compress conversation content to free context space. Supports two modes: range mode (specify content array with startId/endId/summary per entry) and legacy mode (specify summary with optional targetTokens). Use range mode for precise targeting; fall back to legacy for general oldest-first pruning. When using range mode, wrap each boundary pair: startId (ohcNNNN or bkNN) must appear before endId. Each entry's summary replaces that conversation range entirely. Provide a technical summary of what was removed, including file paths, function signatures, decisions, and constraints.",
        args: {
          topic: tool.schema.string().optional().describe("Range mode: Short label (3-5 words) for the overall batch — e.g. 'Auth System Exploration'"),
          content: tool.schema.array(tool.schema.object({
            startId: tool.schema.string().describe("Boundary at range start: ohcNNNN (message) or bkNN (block)"),
            endId: tool.schema.string().describe("Boundary at range end: ohcNNNN (message) or bkNN (block)"),
            summary: tool.schema.string().describe("Complete technical summary replacing all content in this range. Include user intent, decisions, constraints, file paths, and function signatures."),
          })).optional().describe("Range mode: One or more non-overlapping ranges to compress"),
          summary: tool.schema.string().optional().describe("Legacy mode: Technical summary of compressed content. Use when not specifying content array."),
          targetTokens: tool.schema.number().optional().describe("Legacy mode: Estimated target after compression. Lower = more aggressive. Default uses soft config floor."),
        },
        async execute(args, toolCtx) {
          const callId = toolCtx.callID || null
          const sessionId = toolCtx.sessionID

          if (Array.isArray(args.content) && args.content.length > 0) {
            const result = await executeRangeCompress(ctx, sessionId, callId, args.topic || "Compression", args.content)
            toolCtx.metadata({ title: "Compress Range" })
            const resultSs = getOrCreateState(sessionId)
            await sendCompressNotification(ctx.client, sessionId, config, result.messageIds.length, result.summaryRef, result.compressedTokens, resultSs?.totalTokensSaved || 0, resultSs?.blockCount || 0, result.messageIds.length, 0)
            return `Compressed ${result.messageIds.length} messages across ${args.content.length} range(s). Summary: "${truncateText(result.summaryRef, 200)}"`
          }

          const result = await applyCompress(ctx, sessionId, args.summary, max, min, args.targetTokens)
          toolCtx.metadata({ title: "Compress" })
          const toolSs = getOrCreateState(sessionId)
          await sendCompressNotification(ctx.client, sessionId, config, result.removed, truncateText(args.summary, 200), result.tokensRemoved, toolSs?.totalTokensSaved || 0, toolSs?.blockCount || 0, result.removed, result.afterCount)
          return `Compressed: ${result.removed} messages removed. Summary: "${truncateText(args.summary, 200)}"`
        },
      }),
    },
  }
}
