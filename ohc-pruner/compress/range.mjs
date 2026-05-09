import { tool } from "@opencode-ai/plugin"
import { allocateBlockId, allocateRunId, applyCompressionState, wrapCompressedSummary, COMPRESSED_BLOCK_HEADER, syncBlockToState } from "../state.mjs"
import { appendProtectedUserMessages, appendProtectedPromptInfo, appendProtectedTools } from "./protected-content.mjs"

const BLOCK_PLACEHOLDER_RE = /\{block:([^}]+)\}/g

export function buildRangeSchema() {
  return {
    topic: tool.schema.string().min(1).describe("Short label (3-5 words) for display - e.g., 'Auth System Exploration'"),
    content: tool.schema.array(tool.schema.object({
      startId: tool.schema.string().min(1).describe("Message ID marking beginning of range (e.g. m0001, b2)"),
      endId: tool.schema.string().min(1).describe("Message ID marking end of range (e.g. m0012, b5)"),
      summary: tool.schema.string().min(1).describe("Complete technical summary replacing all content in range"),
    })).min(1).describe("One or more ranges to compress"),
  }
}

export function validateArgs(input) {
  if (!input?.topic || typeof input.topic !== "string") throw new Error("topic is required (string)")
  if (!Array.isArray(input?.content) || input.content.length === 0) throw new Error("content must be a non-empty array")
  for (const entry of input.content) {
    if (!entry.startId || !entry.endId || !entry.summary) throw new Error("Each content entry needs startId, endId, summary")
  }
}

function findMessageIndex(messages, id, state) {
  const rawId = state?.refToRawId?.get(id) || id
  return messages.findIndex(m => {
    const mid = m.info?.ohcRef || m.info?.id || m.id || m.messageId || ""
    if (mid === id || mid === rawId || mid === `ohc-summary:${id}`) return true
    if (id === mid.replace("ohc-summary:", "") || rawId === mid) return true
    const text = extractMessageText(m)
    if (text.indexOf(`[${id}]`) >= 0) return true
    return false
  })
}

function findBlockByMessageId(messages, id) {
  for (const msg of messages) {
    if (msg.info?.id === id || msg.id === id || msg.messageId === id) {
      if (msg.parts?.some(p => p.type === "text" && p.text?.includes("<ohc-summary"))) {
        const match = msg.parts.find(p => p.text?.match(/<ohc-summary id="([^"]+)"/))
        if (match) {
          const bid = match.text.match(/<ohc-summary id="([^"]+)"/)[1]
          return { blockId: bid, messageId: msg.info?.id || msg.id || msg.messageId }
        }
      }
    }
  }
  return null
}

function parseBlockPlaceholders(summary) {
  const ids = []
  let m
  BLOCK_PLACEHOLDER_RE.lastIndex = 0
  while ((m = BLOCK_PLACEHOLDER_RE.exec(summary)) !== null) {
    ids.push(m[1])
  }
  return ids
}

function injectBlockSummaries(summary, state, searchContext) {
  let result = summary
  BLOCK_PLACEHOLDER_RE.lastIndex = 0
  let m
  while ((m = BLOCK_PLACEHOLDER_RE.exec(summary)) !== null) {
    const blockId = m[1]
    const block = state.blocks.find(b => b.id === blockId)
    if (block) {
      result = result.replace(`{block:${blockId}}`, `[Summary: ${block.topic}]\n${block.summary}`)
    }
  }
  return result
}

export function createCompressRangeTool(pluginContext) {
  const { client, state, config, cwd, searchContext } = pluginContext

  return tool({
    description: [
      "Compress closed conversation spans into high-fidelity technical summaries.",
      "Provide one or more ranges with startId, endId, and a comprehensive summary.",
      "Nest earlier compression blocks using {block:b1} syntax in summaries.",
    ].join(" "),
    args: buildRangeSchema(),
    async execute(args, toolCtx) {
      validateArgs(args)

      let sessionResponse
      try { sessionResponse = await client.session.messages({ path: { id: toolCtx.sessionID } }) } catch {}
      const apiMessages = Array.isArray(sessionResponse?.data) ? sessionResponse.data
        : Array.isArray(sessionResponse) ? sessionResponse : []
      const cachedMessages = Array.isArray(state.cachedMessages) ? state.cachedMessages : []
      const rawMessages = cachedMessages.length > 0 ? cachedMessages : apiMessages

      if (rawMessages.length === 0) {
        throw new Error("No messages available in session")
      }

      const resolvedPlans = []
      for (const entry of args.content) {
        const startIdx = findMessageIndex(rawMessages, entry.startId, state)
        const endIdx = findMessageIndex(rawMessages, entry.endId, state)
        if (startIdx === -1 || endIdx === -1) {
          throw new Error(`Unable to resolve range IDs: ${entry.startId} -> ${entry.endId}`)
        }
        if (endIdx < startIdx) throw new Error(`Invalid range order: ${entry.startId} must come before ${entry.endId}`)

        const messageIds = rawMessages.slice(startIdx, endIdx + 1).map(m => m.info?.id || m.id || m.messageId || "").filter(Boolean)

        const requiredBlockIds = []
        for (let i = startIdx; i <= endIdx; i++) {
          const msgText = extractMessageText(rawMessages[i])
          const blockRefs = [...msgText.matchAll(/<ohc-summary id="([^"]+)">/g)]
          for (const [, bid] of blockRefs) {
            if (!requiredBlockIds.includes(bid)) requiredBlockIds.push(bid)
          }
        }

        let finalSummary = entry.summary

        const parsedPlaceholders = parseBlockPlaceholders(entry.summary)
        for (const ph of parsedPlaceholders) {
          const block = state.blocks.find(b => b.id === ph)
          if (block) {
            finalSummary = finalSummary.replace(`{block:${ph}}`, `[Previous: ${block.topic}]\n${block.summary}`)
          }
        }

        const searchCtx = {
          messageById: new Map(rawMessages.map(m => {
            const key = m.info?.ohcRef || m.info?.id || m.id || m.messageId || ""
            return [key, m]
          })),
          summaryByBlockId: new Map(state.blocks.map(b => [b.id, b.summary])),
          cwd: config.directory || cwd || process.cwd(),
        }

        finalSummary = appendProtectedUserMessages(finalSummary, { messageIds }, { messageById: searchCtx.messageById }, config)
        finalSummary = appendProtectedPromptInfo(finalSummary, { messageIds }, { messageById: searchCtx.messageById }, config)
        finalSummary = await appendProtectedTools(client, config, finalSummary, { messageIds }, searchCtx)

        resolvedPlans.push({
          entry,
          startIdx,
          endIdx,
          messageIds,
          requiredBlockIds,
          anchorMessageId: messageIds[0],
          finalSummary,
        })
      }

      resolvedPlans.sort((a, b) => a.startIdx - b.startIdx || a.endIdx - b.endIdx)

      for (let i = 1; i < resolvedPlans.length; i++) {
        if (resolvedPlans[i].startIdx <= resolvedPlans[i - 1].endIdx) {
          throw new Error("Compression ranges must not overlap")
        }
      }

      const runId = allocateRunId(state)
      const totalSummaryTokens = resolvedPlans.reduce((sum, p) => sum + countTokens(p.finalSummary), 0)
      let totalCompressedMessages = 0

      for (const plan of resolvedPlans) {
        const blockId = allocateBlockId(state)
        const storedSummary = wrapCompressedSummary(blockId, plan.finalSummary)

        const block = applyCompressionState(state, {
          topic: args.topic,
          batchTopic: args.topic,
          startId: plan.entry.startId,
          endId: plan.entry.endId,
          mode: "range",
          runId,
          compressMessageId: toolCtx.messageID,
          compressCallId: toolCtx.callID,
          summaryTokens: countTokens(storedSummary),
        }, {
          messageIds: plan.messageIds,
        }, plan.anchorMessageId, blockId, storedSummary, plan.requiredBlockIds)

        totalCompressedMessages += plan.messageIds.length
      }

      syncBlockToState(state, cwd)

      try {
        toolCtx.metadata({ title: `OHC compress: ${args.topic}`, metadata: { topic: args.topic, runId, ranges: resolvedPlans.length, messages: totalCompressedMessages } })
      } catch {}

      if (config.pruneNotification !== "off") {
        try {
          const detail = config.pruneNotification === "detailed"
            ? `Compressed ${totalCompressedMessages} msgs into ${resolvedPlans.length} block(s). Topic: ${args.topic}`
            : `Compressed ${totalCompressedMessages} messages`
          await client.tui.showToast({ body: { title: `OHC: ${args.topic}`, message: detail, variant: "info", duration: 5000 } })
        } catch {}
      }

      return `Compressed ${totalCompressedMessages} messages into ${resolvedPlans.length} ${COMPRESSED_BLOCK_HEADER} block(s).`
    },
  })
}

function extractMessageText(msg) {
  if (!Array.isArray(msg?.parts)) return ""
  return msg.parts.filter(p => p?.type === "text").map(p => p.text || "").join("\n")
}

function countTokens(text) {
  if (!text) return 0
  return Math.ceil(text.length / 4)
}

export { countTokens }
