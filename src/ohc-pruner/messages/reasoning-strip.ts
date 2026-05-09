import { getLastUserMessage, isIgnoredUserMessage } from "./query.js"

export function stripStaleMetadata(messages: unknown[]): void {
  const lastUserMessage = getLastUserMessage(messages)
  if (!lastUserMessage) return

  const info = lastUserMessage.info as Record<string, unknown> | undefined
  if (!info) return

  const modelID = info.modelID as string | undefined
  const providerID = info.providerID as string | undefined

  for (const message of messages) {
    const m = message as Record<string, unknown>
    const msgInfo = m.info as Record<string, unknown> | undefined
    if (!msgInfo || msgInfo.role !== "assistant") continue

    if (msgInfo.modelID === modelID && msgInfo.providerID === providerID) continue

    const parts = Array.isArray(m.parts) ? m.parts : []
    m.parts = parts.map((part: Record<string, unknown>) => {
      if (part.type !== "text" && part.type !== "tool" && part.type !== "reasoning") return part
      if (!("metadata" in part)) return part
      const { metadata: _metadata, ...rest } = part
      return rest
    })
  }
}
