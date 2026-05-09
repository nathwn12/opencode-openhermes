import type { SessionState } from "../state.js"
import { isIgnoredUserMessage } from "../messages/query.js"
import { filterMessages } from "../messages/shape.js"
import { getMessageId } from "../messages/index.js"

export interface SearchContext {
  rawMessages: unknown[]
  rawMessagesById: Map<string, unknown>
  rawIndexById: Map<string, number>
  summaryByBlockId: Map<string, unknown>
}

export function buildSearchContext(state: SessionState, rawMessages: unknown[]): SearchContext {
  const rawMessagesById = new Map<string, unknown>()
  const rawIndexById = new Map<string, number>()

  for (const msg of rawMessages) {
    const m = msg as Record<string, unknown>
    const info = m.info as Record<string, unknown> | undefined
    if (info?.id) rawMessagesById.set(info.id as string, msg)
  }
  for (let index = 0; index < rawMessages.length; index++) {
    const message = rawMessages[index] as Record<string, unknown>
    const info = message.info as Record<string, unknown> | undefined
    if (info?.id) rawIndexById.set(info.id as string, index)
  }

  const summaryByBlockId = new Map<string, unknown>()
  for (const block of state.blocks) {
    if (block.appliedAt !== null) {
      summaryByBlockId.set(block.id, block)
    }
  }

  return { rawMessages, rawMessagesById, rawIndexById, summaryByBlockId }
}

export function resolveMessageIndexById(
  state: SessionState,
  messages: unknown[],
  id: string,
): number | null {
  const normalized = id.trim().toLowerCase()

  const rawId = state.refToRawId.get(normalized)
  const ref = state.rawIdToRef.get(normalized)

  const searchId = rawId || ref || normalized

  for (let i = 0; i < messages.length; i++) {
    const mid = getMessageId(messages[i] as Record<string, unknown>)
    if (mid === searchId || mid === normalized) return i
    const info = (messages[i] as Record<string, unknown>).info as Record<string, unknown> | undefined
    if (info?.id === searchId || info?.id === normalized) return i
  }

  return null
}
