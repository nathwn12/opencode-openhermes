function formatTokenCount(tokens) {
  if (tokens >= 1000) return `${(tokens / 1000).toFixed(1)}K`.replace(".0K", "K")
  return String(tokens)
}

function buildProgressBar(prunedCount, visibleCount, width) {
  width = width || 30
  const total = prunedCount + visibleCount
  if (total === 0) return `\u2502${"\u2591".repeat(width)}\u2502  0% active`
  const activeRatio = visibleCount / total
  const activeW = Math.round(activeRatio * width)
  const prunedW = width - activeW
  const bar = "\u2588".repeat(Math.min(activeW, width)) + "\u2591".repeat(Math.min(prunedW, width))
  return `\u2502${bar.slice(0, width)}\u2502  ${Math.round(activeRatio * 100)}% active`
}

function buildMinimal(count, tokensRemoved, savedTotal, blockCount, fromAuto) {
  const label = fromAuto ? "Auto-Prune" : "Compression"
  return `\u25A3 OHC | ~${formatTokenCount(savedTotal)} saved total \u2014 ${label}`
}

function buildDetailed(count, tokensRemoved, savedTotal, blockCount, prunedCount, visibleCount, summary, fromAuto) {
  const label = fromAuto ? "Auto-Prune" : "Compression"
  let msg = `\u25A3 OHC | ~${formatTokenCount(savedTotal)} saved total`
  const pctThatsCompressionMessage = prunedCount + visibleCount > 0
  if (pctThatsCompressionMessage) {
    msg += `\n\n${buildProgressBar(prunedCount, visibleCount)}`
  }
  msg += `\n\n\u25A3 ${label} #${blockCount}`
  msg += `\n\u2192 ${count} message${count === 1 ? "" : "s"} removed`
  if (summary) msg += `\n\u2192 Summary: ${summary}`
  return msg
}

function buildMemoryHeader(action, summary) {
  return `[Memory] ${summary}`
}

function buildMemoryDetailed(action, cls, id, summary) {
  let msg = `\u25A3 Memory ${action}`
  if (cls) msg += `\n\u2192 Class: ${cls}`
  if (id) msg += `\n\u2192 ID: ${id}`
  if (summary) msg += `\n\u2192 ${summary}`
  return msg
}

export async function sendCompressNotification(client, sessionId, config, count, summary, tokensRemoved, savedTotal, blockCount, prunedCount, visibleCount, fromAuto) {
  if (count === 0) return false

  const notifType = config.notification ?? "toast"
  const notifMode = config.notificationMode ?? "minimal"

  if (notifType === "off") return false

  if (notifType === "toast") {
    const message = notifMode === "minimal"
      ? buildMinimal(count, tokensRemoved, savedTotal, blockCount, fromAuto)
      : buildDetailed(count, tokensRemoved, savedTotal, blockCount, prunedCount, visibleCount, summary, fromAuto)
    try {
      await client.tui.showToast({
        body: {
          title: "OHC: Compression",
          message,
          variant: "info",
          duration: 5000,
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
        parts: [{ type: "text", text: buildDetailed(count, tokensRemoved, savedTotal, blockCount, prunedCount, visibleCount, summary, fromAuto), ignored: true }],
      },
    })
  } catch {}
  return true
}

export async function sendMemoryNotification(client, sessionId, config, action, cls, id, summary) {
  const notifType = config.notification ?? "toast"
  const notifMode = config.notificationMode ?? "minimal"

  if (notifType === "off") return false

  if (notifType === "toast") {
    const message = notifMode === "minimal"
      ? buildMemoryHeader(action, summary)
      : buildMemoryDetailed(action, cls, id, summary)
    try {
      await client.tui.showToast({
        body: {
          title: "Memory",
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
        parts: [{ type: "text", text: buildMemoryDetailed(action, cls, id, summary), ignored: true }],
      },
    })
  } catch {}
  return true
}
