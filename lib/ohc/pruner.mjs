import { tool } from "@opencode-ai/plugin"
import { loadConfig } from "./config.mjs"
import { selectMessagesToReap, totalTokens, msgTokens } from "./reaper.mjs"
import {
  loadOhcState, saveOhcState, createSessionState,
  serializeState, deserializeState, resetOhcState,
  buildToolIdList, syncToolCache, countTurns,
} from "./state.mjs"
import { sendCompressNotification } from "./notify.mjs"
import { deduplicate, purgeErrors } from "./strategies/index.mjs"
import { applyPruneTools, filterCompressedBlocks, applyFullToolRemoval } from "./prune-apply.mjs"
import { assignMessageRefs, injectMessageIds, cleanupMessageRefs } from "./message-ids.mjs"
import { syncCompressionBlocks } from "./block-sync.mjs"
import { checkSession } from "./session.mjs"
import { buildSearchContext, resolveBoundaryIds, resolveSelection, resolveAnchorMessageId, validateNonOverlapping } from "./compress/search.mjs"
import { allocateBlockId, allocateRunId, wrapBlockSummary, applyCompressionState } from "./compress/state.mjs"
import { evaluateState, isMutationAllowed, isBelowThreshold } from "./policy.mjs"

function filterMessagesInPlace(messages) {
  if (!Array.isArray(messages)) return []
  let writeIndex = 0
  let stripped = 0
  for (const msg of messages) {
    const info = msg?.info
    const parts = msg?.parts
    if (
      info && typeof info === "object" &&
      typeof info.id === "string" && info.id.length > 0 &&
      typeof info.sessionID === "string" && info.sessionID.length > 0 &&
      (info.role === "user" || info.role === "assistant") &&
      info.time && typeof info.time === "object" && typeof info.time.created === "number" &&
      Array.isArray(parts)
    ) {
      messages[writeIndex++] = msg
    } else {
      stripped++
    }
  }
  if (stripped > 0) {
    console.warn(`[OHC] filterMessagesInPlace: stripped ${stripped} malformed message(s)`)
  }
  messages.length = writeIndex
  return messages
}

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

function summarizeRemoved(selected, summary) {
  const n = selected.length
  if (summary) return `\u25a3 Compressed: ${summary} \u2014 ${n} message${n === 1 ? "" : "s"} removed`
  return `\u25a3 Auto-pruned: ${n} message${n === 1 ? "" : "s"} removed`
}

function createSummaryMessage(text, sessionID) {
  return {
    parts: [{ type: "text", text }],
    info: {
      role: "user",
      sessionID: sessionID || "",
      time: { created: Date.now() },
      summary: true,
    },
  }
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
  }

  const tokensRemoved = selected.reduce((s, r) => s + r.tokens, 0)
  const beforeTotal = totalTokens(msgs)
  const afterTotal = beforeTotal - tokensRemoved
  if (ss) {
    ss.blockCount++
    ss.totalTokensSaved += tokensRemoved
    ss.totalMessagesRemoved += selected.length
    saveOhcState(sessionId, serializeState(ss))
  }
  return { removed: selected.length, afterTotal, tokensRemoved, beforeTotal, beforeCount: msgs.length, afterCount: msgs.length - selected.length }
}

function truncateText(s, n) {
  if (!s || s.length <= n) return s || ""
  return s.slice(0, n) + "..."
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
  let totalActualTokensRemoved = 0
  const allMessageIds = []

  for (const plan of plans) {
    const blockId = allocateBlockId(ss)
    const storedSummary = wrapBlockSummary(blockId, plan.entry.summary)
    const summaryTokens = Math.ceil(storedSummary.length / 4)

    const actualTokensRemoved = plan.selection.messageIds.reduce((sum, mid) => {
      const msg = searchContext.rawMessagesById.get(mid)
      return msg ? sum + msgTokens(msg) : sum
    }, 0)
    totalActualTokensRemoved += actualTokensRemoved
    allMessageIds.push(...plan.selection.messageIds)

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
        compressedTokens: actualTokensRemoved,
      },
      plan.selection,
      plan.anchorMessageId,
      blockId,
      storedSummary,
      plan.selection.requiredBlockIds,
    )

    ss.blockCount++
    ss.totalTokensSaved += actualTokensRemoved
    ss.totalMessagesRemoved += plan.selection.messageIds.length

    notifications.push({
      blockId,
      runId,
      summary: plan.entry.summary,
      messageIds: plan.selection.messageIds,
    })
  }

  saveOhcState(sessionId, serializeState(ss))

  return {
    messageIds: allMessageIds,
    compressedTokens: totalActualTokensRemoved,
    summaryRef: content[0]?.summary || topic,
    blockCount: plans.length,
    afterCount: rawMessages.length - allMessageIds.length,
  }
}

export const OhcPlugin = async (ctx) => {
  const config = loadConfig(ctx)
  if (!config.enabled) return {}

  const max = config.max
  const min = config.min
  if (max <= min + 10000) return {}

  function buildTimingStr(ss) {
    if (!ss?.compressionTiming?.totalDurationMs) return ""
    const last = ss.compressionTiming.lastDurationMs || 0
    const total = ss.compressionTiming.totalDurationMs || 0
    const lastSec = (last / 1000).toFixed(1)
    const totalSec = (total / 1000).toFixed(1)
    return ` (last: ${lastSec}s, total: ${totalSec}s)`
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

  return {
    "experimental.chat.system.transform": async (input, output) => {
      if (!output.system?.length) return

      const INTERNAL_AGENTS = [
        "You are a title generator",
        "summarizing conversations",
        "summarization assistant",
      ]
      const systemText = output.system.join("\n")
      if (INTERNAL_AGENTS.some(s => systemText.includes(s))) return

      const triggerPct = Math.round(((config._effectiveMaxTrigger || max) / max) * 100)
      const targetPct = Math.round(((config._effectiveTargetFloor || min) / max) * 100)
      const ceilingLine = config._hardCeiling !== false
        ? `Max is a hard ceiling \u2014 NEVER exceed ${max.toLocaleString()}.`
        : `Max is a soft ceiling \u2014 slight overshoot tolerated.`

      const prompt = [
        "## Context Management",
        "",
        `OHC (OpenHermes Context) active with user-set boundaries: min=${min}, max=${max}.`,
        `Preset: ${config.preset} \u2014 triggers at ~${triggerPct}% of max, compacts to ~${targetPct}% of max.`,
        ceilingLine,
        "",
        `You auto-compress via \`compress\` tool when exceeding trigger point. Boundaries are absolute.`,
      ].join("\n")

      output.system[output.system.length - 1] += "\n\n" + prompt
    },

    "experimental.chat.messages.transform": async (_input, output) => {
      if (!output?.messages?.length) return

      filterMessagesInPlace(output.messages)
      if (!output.messages.length) return

      const sessionId = getSessionId(output.messages)
      if (!sessionId) return

      const ss = getOrCreateState(sessionId)
      if (!ss) return

      const sessionResult = checkSession(ss, output.messages)
      if (sessionResult.sessionChanged || sessionResult.compacted) {
        ss._pruneCycleDone = false
      }

      if (ss.sessionId && !ss._subAgentChecked && ctx?.client?.session?.get) {
        try {
          const sessionData = await ctx.client.session.get({ path: { id: sessionId } })
          ss.isSubAgent = !!sessionData?.data?.parentID
        } catch {}
        ss._subAgentChecked = true
      }

      if (ss.isSubAgent) {
        syncToolCache(ss, output.messages)
        buildToolIdList(ss, output.messages)
        ss.currentTurn = countTurns(ss, output.messages)
        return
      }

      if (ss.prune?.messages?.blocksById?.size > 0) {
        const liveIds = new Set()
        for (const msg of output.messages) {
          if (msg.info?.id) liveIds.add(msg.info.id)
        }
        const trackedIds = [...ss.prune.messages.byMessageId.keys()]
        if (trackedIds.length > 0) {
          const stillLive = trackedIds.filter(id => liveIds.has(id))
          const missing = trackedIds.length - stillLive.length
          if (missing > trackedIds.length * 0.5) {
            saveOhcState(sessionId, serializeState(ss))
            resetOhcState(ss)
            saveOhcState(sessionId, serializeState(ss))
          }
        }
      }

      syncToolCache(ss, output.messages)
      buildToolIdList(ss, output.messages)
      ss.currentTurn = countTurns(ss, output.messages)

      const measuredTokens = totalTokens(output.messages)
      const ohcState = evaluateState(measuredTokens, config)

      if (!ss.ohcFirstMessageAt) ss.ohcFirstMessageAt = Date.now()

      if (isBelowThreshold(ohcState)) return

      if (isMutationAllowed(ohcState)) {
        assignMessageRefs(ss, output.messages)
        injectMessageIds(ss, output.messages)
        syncCompressionBlocks(ss, output.messages)
        await filterCompressedBlocks(ss, output.messages, config, ctx.client)

        deduplicate(ss, config, output.messages)
        purgeErrors(ss, config, output.messages)
        applyPruneTools(ss, output.messages)
        applyFullToolRemoval(ss, output.messages)
      }

      const now = Date.now()
      const recentlyPruned = ss.lastAutoPruneAt && (now - ss.lastAutoPruneAt) < AUTOPRUNE_COOLDOWN

      if (ss.prunedIds.size > 0 && !recentlyPruned) {
        const currentIds = new Set(output.messages.map(m => m.info?.id).filter(Boolean))
        if ([...ss.prunedIds].every(id => !currentIds.has(id))) {
          cleanupMessageRefs(ss, ss.prunedIds)
          ss.prunedIds.clear()
          ss.summary = null
          ss.anchorMessageId = null
          ss._pruneCycleDone = false
          saveOhcState(sessionId, serializeState(ss))
        }
      }

      const currentTotal = totalTokens(output.messages)
      const triggerPoint = config._effectiveMaxTrigger || max
      const hardCeiling = config._hardCeiling !== false
      const effectiveTarget = config._effectiveTargetFloor || min

      if ((currentTotal > triggerPoint || (hardCeiling && currentTotal > max)) && !recentlyPruned && !ss._pruneCycleDone) {
        const selected = selectMessagesToReap(output.messages, max, effectiveTarget, "compress")
        if (selected.length > 0) {
          for (const r of selected) ss.prunedIds.add(r.id)
          if (!ss.summary) ss.summary = summarizeRemoved(selected, null)
          if (!ss.anchorMessageId) ss.anchorMessageId = selected[0].id
          const tokensRemoved = selected.reduce((s, r) => s + r.tokens, 0)
          ss.blockCount++
          ss.totalTokensSaved += tokensRemoved
          ss.totalMessagesRemoved += selected.length
          saveOhcState(sessionId, serializeState(ss))
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
            result.push(createSummaryMessage(summary, sessionId))
            injected = true
          }

          if (msgId !== undefined && prunedIds.has(msgId)) continue

          result.push(msg)
        }

        if (!injected && summary && result.length > 1) {
          result.splice(1, 0, createSummaryMessage(summary, sessionId))
        }

        output.messages.length = 0
        output.messages.push(...result)
      }
    },

    "experimental.text.complete": async (_input, output) => {
      if (output.text) {
        output.text = output.text
          .replace(/<ohc-ref>[^<]*<\/ohc-ref>/gi, "")
          .replace(/<ohc-ref\/>/gi, "")
          .replace(/<bk\d+>/gi, "")
          .trim()
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
        const blockLine = activeBlockIds.length ? ` bk${activeBlockIds.join(", bk")}` : ""
        const pct = Math.round((t / max) * 100)
        const text = `\u25a3 OHC | ${msgs.length} visible (${prunedCount} auto, ${strategyPruned} strategy) \u00b7 ~${Math.round(t / 1000)}K / ${pct}%${blockLine}${timing}`
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
        const totalRemoved = ss?.totalMessagesRemoved || 0
        const dedupPruned = ss?.prune?.tools?.size || 0
        const autoPruned = ss?.prunedIds?.size || 0
        const timing = buildTimingStr(ss)
        const activeBlockIds = [...(ss?.prune?.messages?.activeBlockIds || [])].filter(id => Number.isInteger(id)).sort((a, b) => a - b)
        const blockLine = activeBlockIds.length ? ` \u00b7 bk${activeBlockIds.join(", bk")}` : ""
        const lines = [
          `\u250c\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2510`,
          `\u2502  \u25a3 OHC Statistics${" ".repeat(37)}\u2502`,
          `\u2514\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2518`,
          "",
          `  Blocks: ${blocks}${blockLine}`,
          `  Saved:  ~${Math.round(totalSaved / 1000)}K tokens`,
          `  Auto:   ${autoPruned} msgs pruned`,
          `  Strat:  ${dedupPruned} tools pruned`,
          `  Total:  ${totalRemoved} msgs removed${timing}`,
        ]
        const text = lines.join("\n")
        await ctx.client.session.prompt({
          path: { id: input.sessionID },
          body: { noReply: true, parts: [{ type: "text", text, ignored: true }] },
        })
        throw new Error("__OHC_STATS_HANDLED__")
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
          await sendCompressNotification(ctx.client, input.sessionID, config, result.removed, focus, result.tokensRemoved, cmdSs, result.afterCount)
          output.parts.length = 0
          output.parts.push({
            type: "text",
            text: `\u25a3 Compressed ${result.removed} msgs. Summary: ${focus}`,
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
        const maxRoleLen = Math.max(...Object.keys(roles).map(r => r.length), 0)

        const lines = [
          `\u250c\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2510`,
          `\u2502  \u25a3 OHC Context${" ".repeat(27)}\u2502`,
          `\u2514\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2518`,
          "",
          `  Messages: ${msgs.length} visible (${autoPruned + stratPruned} pruned)`,
          `  Tokens:   ~${Math.round(visibleTokens / 1000)}K visible / ~${Math.round(totalTokensWithPruned / 1000)}K total`,
          `  Blocks:   ${blocks} (~${Math.round(totalSaved / 1000)}K saved)`,
          "",
          `  Role breakdown:`,
        ]
        for (const [role, info] of Object.entries(roles)) {
          const pct = visibleTokens > 0 ? Math.round((info.tokens / visibleTokens) * 100) : 0
          lines.push(`    ${role.padEnd(maxRoleLen)}  ${info.count} msgs, ~${Math.round(info.tokens / 1000)}K (${pct}%)`)
        }

        const activeBlockIds = [...(ss?.prune?.messages?.activeBlockIds || [])].filter(id => Number.isInteger(id)).sort((a, b) => a - b)
        if (activeBlockIds.length) {
          lines.push("")
          lines.push(`  Active blocks: bk${activeBlockIds.join(", bk")}`)
        }

        const text = lines.join("\n")
        await ctx.client.session.prompt({
          path: { id: input.sessionID },
          body: { noReply: true, parts: [{ type: "text", text, ignored: true }] },
        })
        throw new Error("__OHC_CONTEXT_HANDLED__")
      }

      const lines = [
        `\u250c\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2510`,
        `\u2502  \u25a3 OHC Commands${" ".repeat(43)}\u2502`,
        `\u2514\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2518`,
        "",
        `  /ohc status              Session context usage`,
        `  /ohc stats               Compression statistics`,
        `  /ohc context             Token usage breakdown by role`,
        `  /ohc compress [focus]    Trigger manual compression`,
      ]
      const text = lines.join("\n")
      await ctx.client.session.prompt({
        path: { id: input.sessionID },
        body: { noReply: true, parts: [{ type: "text", text, ignored: true }] },
      })
      throw new Error("__OHC_HELP_HANDLED__")
    },

    tool: {
      compress: tool({
        description: "Compress conversation content to free context space. Two modes: range mode (specify content array with startId/endId/summary per entry) and summary mode (specify summary with optional targetTokens). Use range for precise targeting; fall back to summary for general oldest-first pruning. In range mode, each startId/endId pair uses message or block references found in conversation. Each entry's summary replaces the entire range. Provide a technical summary of what was removed, including file paths, function signatures, decisions, and constraints.",
        args: {
          topic: tool.schema.string().optional().describe("Range mode: Short label (3-5 words) for the overall batch \u2014 e.g. 'Auth System Exploration'"),
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
            await sendCompressNotification(ctx.client, sessionId, config, result.messageIds.length, result.summaryRef, result.compressedTokens, resultSs, result.afterCount || 0)
            return `\u25a3 Compressed ${result.messageIds.length} msgs across ${args.content.length} range(s). Summary: "${truncateText(result.summaryRef, 200)}"`
          }

          const result = await applyCompress(ctx, sessionId, args.summary, max, min, args.targetTokens)
          toolCtx.metadata({ title: "Compress" })
          const toolSs = getOrCreateState(sessionId)
          await sendCompressNotification(ctx.client, sessionId, config, result.removed, truncateText(args.summary, 200), result.tokensRemoved, toolSs, result.afterCount)
          return `\u25a3 Compressed ${result.removed} msgs. Summary: "${truncateText(args.summary, 200)}"`
        },
      }),
    },

    config: async (opencodeConfig) => {
      opencodeConfig.command ??= {}
      opencodeConfig.command["ohc"] = {
        template: "",
        description: "OHC context management commands",
      }

      const existingPrimaryTools = opencodeConfig.experimental?.primary_tools ?? []
      opencodeConfig.experimental = {
        ...opencodeConfig.experimental,
        primary_tools: [...existingPrimaryTools, "compress"],
      }

      const permission = opencodeConfig.permission ?? {}
      opencodeConfig.permission = {
        ...permission,
        compress: "allow",
      }
    },
  }
}
