function formatTokenCount(tokens) {
  if (tokens >= 1000) return `${(tokens / 1000).toFixed(1)}K`.replace(".0K", "K")
  return String(tokens)
}

function buildHeader(removedCount, fromAuto) {
  const label = fromAuto ? "auto-pruned" : "compressed"
  return `[OHC] ${removedCount} message${removedCount === 1 ? "" : "s"} ${label}`
}

function buildDetailed(removedCount, summary, afterTotal, fromAuto) {
  const label = fromAuto ? "Auto-Prune" : "Compression"
  let msg = `▣ OHC ${label}`
  if (removedCount > 0) msg += `\n→ ${removedCount} message${removedCount === 1 ? "" : "s"} removed`
  if (summary) msg += `\n→ ${summary}`
  if (afterTotal !== undefined) msg += `\n→ After: ~${formatTokenCount(afterTotal)}`
  return msg
}

export async function sendCompressNotification(client, sessionId, config, removedCount, summary, afterTotal, fromAuto) {
  if (removedCount === 0) return false

  const notifType = config.notification ?? "toast"
  const notifMode = config.notificationMode ?? "minimal"

  if (notifType === "off") return false

  if (notifType === "toast") {
    const message = notifMode === "minimal"
      ? buildHeader(removedCount, fromAuto)
      : buildDetailed(removedCount, summary, afterTotal, fromAuto)
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
        parts: [{ type: "text", text: buildDetailed(removedCount, summary, afterTotal, fromAuto), ignored: true }],
      },
    })
  } catch {}
  return true
}
