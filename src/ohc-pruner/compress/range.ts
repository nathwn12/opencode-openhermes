import { tool } from "@opencode-ai/plugin"
import type { SessionState } from "../state.js"
import { allocateBlockId, allocateRunId, applyCompressionState, wrapCompressedSummary, COMPRESSED_BLOCK_HEADER, syncBlockToState } from "../state.js"
import { appendProtectedUserMessages, appendProtectedPromptInfo, appendProtectedTools } from "./protected-content.js"
import type { PluginConfig } from "../config.js"

interface RangeToolContext {
  sessionID: string
  messageID?: string
  callID?: string
  metadata?: (opts: { title: string; metadata: Record<string, unknown> }) => void
}

interface PluginToolContext {
  client: unknown
  state: SessionState
  config: PluginConfig
  cwd: string
  searchContext?: { cwd: string }
}

interface RangeEntry {
  startId: string
  endId: string
  summary: string
}

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

export function validateArgs(input: { topic?: unknown; content?: unknown }): void {
  if (!input?.topic || typeof input.topic !== "string") throw new Error("topic is required (string)")
  if (!Array.isArray(input?.content) || input.content.length === 0) throw new Error("content must be a non-empty array")
  for (const entry of input.content) {
    if (!entry.startId || !entry.endId || !entry.summary) throw new Error("Each content entry needs startId, endId, summary")
  }
}

function findMessageIndex(messages: unknown[], id: string, state?: SessionState): number {
  const rawId = state?.refToRawId?.get(id) || id
  return (messages as Array<Record<string, unknown>>).findIndex(m => {
    const info = m.info as Record<string, unknown> | undefined
    const mid = (info?.ohcRef as string) || (info?.id as string) || (m.id as string) || (m.messageId as string) || ""
    if (mid === id || mid === rawId || mid === `ohc-summary:${id}`) return true
    if (id === mid.replace("ohc-summary:", "") || rawId === mid) return true
    const text = extractMessageText(m)
    if (text.indexOf(`[${id}]`) >= 0) return true
    return false
  })
}

function findBlockByMessageId(messages: unknown[], id: string): { blockId: string; messageId: string } | null {
  for (const msg of messages as Array<Record<string, unknown>>) {
    if ((msg.info as Record<string, unknown>)?.id === id || msg.id === id || msg.messageId === id) {
      if (Array.isArray(msg.parts) && (msg.parts as Array<Record<string, unknown>>).some(p => p.type === "text" && (p.text as string)?.includes("<ohc-summary"))) {
        const match = (msg.parts as Array<Record<string, unknown>>).find(p => (p.text as string)?.match(/<ohc-summary id="([^"]+)"/))
        if (match) {
          const bid = (match.text as string).match(/<ohc-summary id="([^"]+)"/)![1]
          return { blockId: bid, messageId: (msg.info as Record<string, unknown>)?.id as string || msg.id as string || msg.messageId as string }
        }
      }
    }
  }
  return null
}

export function createCompressRangeTool(pluginContext: PluginToolContext) {
  const { client, state, config, cwd } = pluginContext

  return tool({
    description: [
      "Compress closed conversation spans into high-fidelity technical summaries.",
      "Provide one or more ranges with startId, endId, and a comprehensive summary.",
      "Nest earlier compression blocks using {block:b1} syntax in summaries.",
    ].join(" "),
    args: buildRangeSchema(),
    async execute(args: Record<string, unknown>, toolCtx: RangeToolContext) {
      validateArgs(args)

      let sessionResponse: unknown
      try { sessionResponse = await (client as any).session.messages({ path: { id: toolCtx.sessionID } }) } catch {}
      const apiMessages = Array.isArray((sessionResponse as Record<string, unknown>)?.data)
        ? (sessionResponse as Record<string, unknown>).data as unknown[]
        : Array.isArray(sessionResponse) ? sessionResponse as unknown[] : []
      const cachedMessages = Array.isArray(state.cachedMessages) ? state.cachedMessages : []
      const rawMessages = cachedMessages.length > 0 ? cachedMessages : apiMessages

      if (rawMessages.length === 0) {
        throw new Error("No messages available in session")
      }

      const entries = (args.content as RangeEntry[])
      const resolvedPlans: Array<{
        entry: RangeEntry
        startIdx: number
        endIdx: number
        messageIds: string[]
        requiredBlockIds: string[]
        anchorMessageId: string
        finalSummary: string
      }> = []

      for (const entry of entries) {
        const startIdx = findMessageIndex(rawMessages, entry.startId, state)
        const endIdx = findMessageIndex(rawMessages, entry.endId, state)
        if (startIdx === -1 || endIdx === -1) {
          throw new Error(`Unable to resolve range IDs: ${entry.startId} -> ${entry.endId}`)
        }
        if (endIdx < startIdx) throw new Error(`Invalid range order: ${entry.startId} must come before ${entry.endId}`)

        const messageIds = rawMessages.slice(startIdx, endIdx + 1).map(m => {
          const mm = m as Record<string, unknown>
          const info = mm.info as Record<string, unknown> | undefined
          return (info?.id as string) || (mm.id as string) || (mm.messageId as string) || ""
        }).filter(Boolean) as string[]

        const requiredBlockIds: string[] = []
        for (let i = startIdx; i <= endIdx; i++) {
          const msgText = extractMessageText(rawMessages[i] as Record<string, unknown>)
          const blockRefs = [...msgText.matchAll(/<ohc-summary id="([^"]+)">/g)]
          for (const [, bid] of blockRefs) {
            if (!requiredBlockIds.includes(bid)) requiredBlockIds.push(bid)
          }
        }

        let finalSummary = entry.summary

        BLOCK_PLACEHOLDER_RE.lastIndex = 0
        for (const match of entry.summary.matchAll(BLOCK_PLACEHOLDER_RE)) {
          const block = state.blocks.find(b => b.id === match[1])
          if (block) {
            finalSummary = finalSummary.replace(`{block:${match[1]}}`, `[Previous: ${block.topic}]\n${block.summary}`)
          }
        }

        const searchCtx = {
          messageById: new Map(rawMessages.map(m => {
            const mm = m as Record<string, unknown>
            const info = mm.info as Record<string, unknown> | undefined
            const key = (info?.ohcRef as string) || (info?.id as string) || (mm.id as string) || (mm.messageId as string) || ""
            return [key, m]
          })),
          summaryByBlockId: new Map(state.blocks.map(b => [b.id, b.summary])),
          cwd: (config as any).directory || cwd || process.cwd(),
        }

        finalSummary = appendProtectedUserMessages(finalSummary, { messageIds }, { messageById: searchCtx.messageById }, config as any)
        finalSummary = appendProtectedPromptInfo(finalSummary, { messageIds }, { messageById: searchCtx.messageById }, config as any)
        finalSummary = await appendProtectedTools(client as any, config, finalSummary, { messageIds }, searchCtx)

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
      let totalCompressedMessages = 0

      for (const plan of resolvedPlans) {
        const blockId = allocateBlockId(state)
        const storedSummary = wrapCompressedSummary(blockId, plan.finalSummary)

        applyCompressionState(state, {
          topic: args.topic as string,
          batchTopic: args.topic as string,
          startId: plan.entry.startId,
          endId: plan.entry.endId,
          mode: "range",
          runId,
          compressMessageId: toolCtx.messageID || null,
          compressCallId: toolCtx.callID || null,
          summaryTokens: countTokens(storedSummary),
        }, {
          messageIds: plan.messageIds,
        }, plan.anchorMessageId, blockId, storedSummary, plan.requiredBlockIds)

        totalCompressedMessages += plan.messageIds.length
      }

      syncBlockToState(state, cwd)

      try {
        (toolCtx as any).metadata({ title: `OHC compress: ${args.topic}`, metadata: { topic: args.topic, runId, ranges: resolvedPlans.length, messages: totalCompressedMessages } })
      } catch {}

      if (config.pruneNotification !== "off") {
        try {
          const detail = config.pruneNotification === "detailed"
            ? `Compressed ${totalCompressedMessages} msgs into ${resolvedPlans.length} block(s). Topic: ${args.topic}`
            : `Compressed ${totalCompressedMessages} messages`
          await (client as any).tui.showToast({ body: { title: `OHC: ${args.topic}`, message: detail, variant: "info", duration: 5000 } })
        } catch {}
      }

      return `Compressed ${totalCompressedMessages} messages into ${resolvedPlans.length} ${COMPRESSED_BLOCK_HEADER} block(s).`
    },
  })
}

function extractMessageText(msg: Record<string, unknown>): string {
  if (!Array.isArray(msg.parts)) return ""
  return (msg.parts as Array<Record<string, unknown>>).filter(p => p?.type === "text").map(p => (p.text as string) || "").join("\n")
}

export function countTokens(text: string): number {
  if (!text) return 0
  return Math.ceil(text.length / 4)
}


