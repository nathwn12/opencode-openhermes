function formatTokenCount(tokens) {
  if (tokens >= 1000) return `${(tokens / 1000).toFixed(1)}K`.replace(".0K", "K")
  return String(tokens)
}

function buildHeader(removedCount, fromAuto, source) {
  const label = fromAuto ? "auto-pruned" : "compressed"
  return `[${source}] ${removedCount} message${removedCount === 1 ? "" : "s"} ${label}`
}

function buildDetailed(removedCount, summary, afterTotal, fromAuto, source) {
  const label = fromAuto ? "Auto-Prune" : "Compression"
  let msg = `▣ ${source} ${label}`
  if (removedCount > 0) msg += `\n→ ${removedCount} message${removedCount === 1 ? "" : "s"} removed`
  if (summary) msg += `\n→ ${summary}`
  if (afterTotal !== undefined) msg += `\n→ After: ~${formatTokenCount(afterTotal)}`
  return msg
}

function buildMemoryHeader(action, summary) {
  return `[Memory] ${summary}`
}

function buildMemoryDetailed(action, cls, id, summary) {
  let msg = `▣ Memory ${action}`
  if (cls) msg += `\n→ Class: ${cls}`
  if (id) msg += `\n→ ID: ${id}`
  if (summary) msg += `\n→ ${summary}`
  return msg
}

export async function sendCompressNotification(client, sessionId, config, removedCount, summary, afterTotal, fromAuto) {
  if (removedCount === 0) return false

  const notifType = config.notification ?? "toast"
  const notifMode = config.notificationMode ?? "minimal"

  if (notifType === "off") return false

  if (notifType === "toast") {
    const message = notifMode === "minimal"
      ? buildHeader(removedCount, fromAuto, "OHC")
      : buildDetailed(removedCount, summary, afterTotal, fromAuto, "OHC")
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
        parts: [{ type: "text", text: buildDetailed(removedCount, summary, afterTotal, fromAuto, "OHC"), ignored: true }],
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
