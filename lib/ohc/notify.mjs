import { createLogger } from "../logger.mjs"
const log = createLogger("ohc-notify")

function formatTokenCount(tokens) {
  if (tokens >= 1_000_000) return `${(tokens / 1_000_000).toFixed(1)}M`.replace(".0M", "M")
  if (tokens >= 1000) return `${(tokens / 1000).toFixed(1)}K`.replace(".0K", "K")
  return String(tokens)
}

function truncate(str, max) {
  if (!str) return ""
  return str.length > max ? str.slice(0, max) + "\u2026" : str
}

function buildCompressionDetailed(count, savedTotal, blockCount, summary) {
  const parts = [
    `\u25a3 ${formatTokenCount(savedTotal)} saved \u00b7 ${count} msg${count === 1 ? "" : "s"} removed \u00b7 #${blockCount} block${blockCount === 1 ? "" : "s"}`,
  ]
  if (summary) parts.push(truncate(summary, 48))
  return parts.join("\n")
}

function buildCompressionMinimal(count, savedTotal, blockCount) {
  return `\u25a3 ${formatTokenCount(savedTotal)} saved \u00b7 ${blockCount} block${blockCount === 1 ? "" : "s"} \u00b7 ${count} msg${count === 1 ? "" : "s"} removed`
}

function buildMemoryMessage(action, cls, id, summary) {
  const idPart = id ? truncate(id, 28) : ""
  return `\u25a3 ${action} \u00b7 ${cls}${idPart ? " \u00b7 " + idPart : ""}`
}

export async function sendCompressNotification(client, sessionId, config, count, summary, tokensRemoved, ss, currentMessageCount) {
  if (count === 0) return false

  const savedTotal = ss?.totalTokensSaved || 0
  const blockCount = ss?.blockCount || 0

  const notifType = config.notification ?? "chat"
  const notifMode = config.notificationMode ?? "detailed"

  if (notifType === "off") return false

  if (notifType === "toast") {
    const message = notifMode === "minimal"
      ? buildCompressionMinimal(count, savedTotal, blockCount)
      : buildCompressionDetailed(count, savedTotal, blockCount, summary)
    try {
      await client.tui.showToast({
        body: {
          title: "OHC",
          message,
          variant: "info",
          duration: 5000,
        },
      })
    } catch (err) { log.warn("toast notification failed", err?.message) }
    return true
  }

  const message = notifMode === "minimal"
    ? buildCompressionMinimal(count, savedTotal, blockCount)
    : buildCompressionDetailed(count, savedTotal, blockCount, summary)
  try {
    await client.session.prompt({
      path: { id: sessionId },
      body: {
        noReply: true,
        parts: [{ type: "text", text: message, ignored: true }],
      },
    })
  } catch (err) { log.warn("chat notification failed", err?.message) }
  return true
}

export async function sendMemoryNotification(client, sessionId, config, action, cls, id, summary) {
  const notifType = config.notification ?? "toast"
  if (notifType === "off") return false

  const message = buildMemoryMessage(action, cls, id, summary)

  if (notifType === "toast") {
    try {
      await client.tui.showToast({
        body: {
          title: "OHC",
          message,
          variant: "info",
          duration: 4000,
        },
      })
    } catch (err) { log.warn("memory toast notification failed", err?.message) }
    return true
  }

  try {
    await client.session.prompt({
      path: { id: sessionId },
      body: {
        noReply: true,
        parts: [{ type: "text", text: message, ignored: true }],
      },
    })
  } catch (err) { log.warn("memory chat notification failed", err?.message) }
  return true
}
