export function isMessageWithInfo(msg: unknown): boolean {
  if (!msg || typeof msg !== "object") return false
  const info = (msg as Record<string, unknown>).info
  if (!info || typeof info !== "object") return false
  const infoObj = info as Record<string, unknown>
  const id = infoObj.id || infoObj.ohcRef
  const role = infoObj.role
  const parts = (msg as Record<string, unknown>).parts
  return typeof id === "string" && id.length > 0
    && (role === "user" || role === "assistant" || role === "system")
    && Array.isArray(parts)
}

export function filterMessages(messages: unknown): unknown[] {
  if (!Array.isArray(messages)) return []
  return messages.filter(isMessageWithInfo)
}

export function filterMessagesInPlace(messages: unknown): unknown[] {
  if (!Array.isArray(messages)) return []
  let writeIndex = 0
  for (const message of messages) {
    if (isMessageWithInfo(message)) {
      messages[writeIndex++] = message
    }
  }
  messages.length = writeIndex
  return messages
}
