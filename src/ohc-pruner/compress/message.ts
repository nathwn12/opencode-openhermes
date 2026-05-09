import { tool } from "@opencode-ai/plugin"
import type { SessionState, CompressionBlock } from "../state.js"
import { allocateBlockId, allocateRunId, applyCompressionState, wrapCompressedSummary, COMPRESSED_BLOCK_HEADER, syncBlockToState } from "../state.js"
import { appendProtectedUserMessages, appendProtectedPromptInfo, appendProtectedTools } from "./protected-content.js"
import type { PluginConfig } from "../config.js"

interface MessageToolContext {
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

function buildMessageSchema() {
  return {
    topic: tool.schema.string().min(1).describe("Short label (3-5 words) for display - e.g., 'Auth System Exploration'"),
    content: tool.schema.array(tool.schema.object({
      messageId: tool.schema.string().min(1).describe("Message ID to compress (e.g. m0001)"),
      summary: tool.schema.string().min(1).describe("Complete technical summary replacing the message content"),
    })).min(1).describe("One or more messages to compress"),
  }
}

function validateArgs(input: { topic?: unknown; content?: unknown }): void {
  if (!input?.topic || typeof input.topic !== "string") throw new Error("topic is required (string)")
  if (!Array.isArray(input?.content) || input.content.length === 0) throw new Error("content must be a non-empty array")
  for (const entry of input.content) {
    if (!entry.messageId || !entry.summary) throw new Error("Each content entry needs messageId and summary")
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

const BLOCK_PLACEHOLDER_RE = /\{block:([^}]+)\}/g

export function createCompressMessageTool(pluginContext: PluginToolContext) {
  const { client, state, config, cwd } = pluginContext

  return tool({
    description: [
      "Compress individual conversation messages into high-fidelity technical summaries.",
      "Provide one or more messages with messageId and a comprehensive summary.",
      "Nest earlier compression blocks using {block:b1} syntax in summaries.",
    ].join(" "),
    args: buildMessageSchema(),
    async execute(args: Record<string, unknown>, toolCtx: MessageToolContext) {
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

      const entries = (args.content as Array<{ messageId: string; summary: string }>)
      const resolvedPlans: Array<{
        entry: { messageId: string; summary: string }
        messageIdx: number
        messageIds: string[]
        requiredBlockIds: string[]
        anchorMessageId: string
        finalSummary: string
      }> = []

      for (const entry of entries) {
        const msgIdx = findMessageIndex(rawMessages, entry.messageId, state)
        if (msgIdx === -1) {
          throw new Error(`Unable to resolve message ID: ${entry.messageId}`)
        }

        const mm = rawMessages[msgIdx] as Record<string, unknown>
        const info = mm.info as Record<string, unknown> | undefined
        const messageIds = [(info?.id as string) || (mm.id as string) || (mm.messageId as string) || entry.messageId].filter(Boolean) as string[]

        const requiredBlockIds: string[] = []
        const msgText = extractMessageText(rawMessages[msgIdx] as Record<string, unknown>)
        const blockRefs = [...msgText.matchAll(/<ohc-summary id="([^"]+)">/g)]
        for (const [, bid] of blockRefs) {
          if (!requiredBlockIds.includes(bid)) requiredBlockIds.push(bid)
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
          messageIdx: msgIdx,
          messageIds,
          requiredBlockIds,
          anchorMessageId: messageIds[0],
          finalSummary,
        })
      }

      resolvedPlans.sort((a, b) => a.messageIdx - b.messageIdx)

      const runId = allocateRunId(state)
      let totalSummarized = 0

      for (const plan of resolvedPlans) {
        const blockId = allocateBlockId(state)
        const storedSummary = wrapCompressedSummary(blockId, plan.finalSummary)

        const block = applyCompressionState(state, {
          topic: args.topic as string,
          batchTopic: args.topic as string,
          startId: plan.entry.messageId,
          endId: plan.entry.messageId,
          mode: "message",
          runId,
          compressMessageId: toolCtx.messageID || null,
          compressCallId: toolCtx.callID || null,
          summaryTokens: countTokens(storedSummary),
        }, {
          messageIds: plan.messageIds,
        }, plan.anchorMessageId, blockId, storedSummary, plan.requiredBlockIds)

        totalSummarized += plan.messageIds.length
      }

      syncBlockToState(state, cwd)

      try {
        (toolCtx as any).metadata({ title: `OHC compress: ${args.topic}`, metadata: { topic: args.topic, runId, mode: "message", messages: totalSummarized } })
      } catch {}

      if ((config as any).pruneNotification !== "off") {
        try {
          const detail = (config as any).pruneNotification === "detailed"
            ? `Summarized ${totalSummarized} msg(s) into ${resolvedPlans.length} block(s). Topic: ${args.topic}`
            : `Summarized ${totalSummarized} messages`
          await (client as any).tui.showToast({ body: { title: `OHC: ${args.topic}`, message: detail, variant: "info", duration: 5000 } })
        } catch {}
      }

      return `Summarized ${totalSummarized} messages into ${resolvedPlans.length} ${COMPRESSED_BLOCK_HEADER} block(s).`
    },
  })
}

function extractMessageText(msg: Record<string, unknown>): string {
  if (!Array.isArray(msg.parts)) return ""
  return (msg.parts as Array<Record<string, unknown>>).filter(p => p?.type === "text").map(p => (p.text as string) || "").join("\n")
}

function countTokens(text: string): number {
  if (!text) return 0
  return Math.ceil(text.length / 4)
}


