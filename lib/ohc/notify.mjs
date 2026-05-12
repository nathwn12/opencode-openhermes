function formatTokenCount(tokens) {
  if (tokens >= 1000) return `${(tokens / 1000).toFixed(1)}K`.replace(".0K", "K")
  return String(tokens)
}

function buildProgressBar(totalMessagesRemoved, currentMessageCount, width) {
  width = width || 20
  const total = totalMessagesRemoved + currentMessageCount
  if (total === 0) return ""
  const activeRatio = currentMessageCount / total
  const activeW = Math.round(activeRatio * width)
  const bar = "\u2593".repeat(Math.min(activeW, width)) + "\u2591".repeat(Math.max(0, width - Math.min(activeW, width)))
  return `  ${bar.slice(0, width)}  ${Math.round(activeRatio * 100)}% active`
}

function buildMinimal() {
  return "OHC: Compression complete."
}

function buildDetailed(count, tokensRemoved, savedTotal, blockCount, totalMessagesRemoved, currentMessageCount, summary) {
  const label = "Compression"
  let msg = `OHC ${label} (~${formatTokenCount(savedTotal)} saved)  #${blockCount}`
  if (totalMessagesRemoved + currentMessageCount > 0) {
    const bar = buildProgressBar(totalMessagesRemoved, currentMessageCount)
    if (bar) msg += `\n${bar}`
  }
  msg += `\n\n  Removed: ${count} message${count === 1 ? "" : "s"}`
  if (summary) msg += `\n  Summary: ${summary}`
  return msg
}

function buildStrategyNotification(strategy, count, detail) {
  return `OHC: ${strategy} \u2014 ${count} pruned${detail ? ` (${detail})` : ""}`
}

export async function sendCompressNotification(client, sessionId, config, count, summary, tokensRemoved, ss, currentMessageCount) {
  if (count === 0) return false

  const savedTotal = ss?.totalTokensSaved || 0
  const blockCount = ss?.blockCount || 0
  const totalMessagesRemoved = ss?.totalMessagesRemoved || 0

  const notifType = config.notification ?? "chat"
  const notifMode = config.notificationMode ?? "detailed"

  if (notifType === "off") return false

  if (notifType === "toast") {
    const message = notifMode === "minimal"
      ? buildMinimal()
      : buildDetailed(count, tokensRemoved, savedTotal, blockCount, totalMessagesRemoved, currentMessageCount, summary)
    try {
      await client.tui.showToast({
        body: {
          title: "OHC",
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
        parts: [{ type: "text", text: buildDetailed(count, tokensRemoved, savedTotal, blockCount, totalMessagesRemoved, currentMessageCount, summary), ignored: true }],
      },
    })
  } catch {}
  return true
}

export async function sendStrategyNotification(client, sessionId, config, strategy, count, detail) {
  if (count === 0) return false
  const notifType = config.notification ?? "chat"
  if (notifType === "off") return false

  const message = buildStrategyNotification(strategy, count, detail)

  if (notifType === "toast") {
    try {
      await client.tui.showToast({
        body: {
          title: "OHC",
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
        parts: [{ type: "text", text: message, ignored: true }],
      },
    })
  } catch {}
  return true
}

export async function sendMemoryNotification(client, sessionId, config, action, cls, id, summary) {
  const notifType = config.notification ?? "toast"
  const notifMode = config.notificationMode ?? "minimal"

  if (notifType === "off") return false

  const buildHeader = (action, summary) => `OHC Memory: ${summary}`
  const buildDetailed = (action, cls, id, summary) => {
    let msg = `OHC Memory \u2014 ${action}`
    if (cls) msg += `\n  Class: ${cls}`
    if (id) msg += `\n  ID: ${id}`
    if (summary) msg += `\n  ${summary}`
    return msg
  }

  if (notifType === "toast") {
    const message = notifMode === "minimal"
      ? buildHeader(action, summary)
      : buildDetailed(action, cls, id, summary)
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
        parts: [{ type: "text", text: buildDetailed(action, cls, id, summary), ignored: true }],
      },
    })
  } catch {}
  return true
}
