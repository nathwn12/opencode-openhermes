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
    `${formatTokenCount(savedTotal)} saved \u00b7 ${count} msg${count === 1 ? "" : "s"} removed \u00b7 #${blockCount} block${blockCount === 1 ? "" : "s"}`,
  ]
  if (summary) parts.push(truncate(summary, 48))
  return parts.join("\n")
}

function buildCompressionMinimal(count, savedTotal, blockCount) {
  return `${formatTokenCount(savedTotal)} saved \u00b7 ${blockCount} block${blockCount === 1 ? "" : "s"} \u00b7 ${count} msg${count === 1 ? "" : "s"} removed`
}

function buildMemoryMessage(action, cls, id, summary) {
  const idPart = id ? truncate(id, 28) : ""
  return [action, cls, idPart].filter(Boolean).join(" \u00b7 ")
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
          title: "OHC Compression",
          message,
          variant: "info",
          duration: 5000,
        },
      })
    } catch {}
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
        parts: [{ type: "text", text: `OHC: ${message}`, ignored: true }],
      },
    })
  } catch {}
  return true
}

export async function sendStrategyNotification(client, sessionId, config, strategy, count, detail) {
  if (count === 0) return false
  const notifType = config.notification ?? "chat"
  if (notifType === "off") return false

  const message = detail ? `${strategy} \u2014 ${count} pruned \u00b7 ${truncate(detail, 36)}` : `${strategy} \u2014 ${count} pruned`

  if (notifType === "toast") {
    try {
      await client.tui.showToast({
        body: {
          title: "OHC Strategy",
          message,
          variant: "info",
          duration: 3000,
        },
      })
    } catch {}
    return true
  }

  try {
    await client.session.prompt({
      path: { id: sessionId },
      body: {
        noReply: true,
        parts: [{ type: "text", text: `OHC: ${message}`, ignored: true }],
      },
    })
  } catch {}
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
          title: "OHC Memory",
          message,
          variant: "info",
          duration: 4000,
        },
      })
    } catch {}
    return true
  }

  try {
    await client.session.prompt({
      path: { id: sessionId },
      body: {
        noReply: true,
        parts: [{ type: "text", text: `OHC: ${message}`, ignored: true }],
      },
    })
  } catch {}
  return true
}
