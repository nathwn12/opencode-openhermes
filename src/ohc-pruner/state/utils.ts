import type { SessionState, PruneEntry } from "../state.js"
import { isIgnoredUserMessage, messageHasCompress } from "../messages/query.js"
import { isMessageWithInfo } from "../messages/shape.js"
import { getMessageId } from "../messages/index.js"

export function isMessageCompacted(state: SessionState, msg: Record<string, unknown>): boolean {
  const msgId = getMessageId(msg)
  if (!msgId) return false

  const pruneMessages = state.prune?.messages
  if (pruneMessages) {
    const entry = pruneMessages.byMessageId.get(msgId) as PruneEntry | undefined
    if (entry && entry.activeBlockIds.length > 0) return true
  }

  return state.blocks.some(b => b.messageIds?.includes(msgId))
}

export function findLastCompactionTimestamp(messages: unknown[]): number {
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i] as Record<string, unknown>
    if (!isMessageWithInfo(msg)) continue
    const info = msg.info as Record<string, unknown>
    if (info.role === "assistant" && info.summary === true) {
      return (info.time as Record<string, unknown>)?.created as number || 0
    }
  }
  return 0
}

export function getActiveSummaryTokenUsage(state: SessionState): number {
  let total = 0
  for (const block of state.blocks) {
    if (block.appliedAt !== null) {
      total += block.summaryTokens || 0
    }
  }
  return total
}

export function countTurns(state: SessionState, messages: unknown[]): number {
  let turnCount = 0
  for (const msg of messages) {
    const m = msg as Record<string, unknown>
    if (isMessageCompacted(state, m)) continue
    const parts = Array.isArray(m.parts) ? (m.parts as any[]) : []
    for (const part of parts) {
      if (part.type === "step-start") turnCount++
    }
  }
  return turnCount
}
