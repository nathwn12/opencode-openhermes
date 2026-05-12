function partTokens(part) {
  if (part.type === "text") return Math.ceil((part.text || "").length / 4)
  if (part.type === "tool") {
    let t = 0
    if (part.state?.input) t += JSON.stringify(part.state.input).length / 4
    if (part.state?.output)
      t += (typeof part.state.output === "string" ? part.state.output : JSON.stringify(part.state.output ?? "")).length / 4
    return Math.ceil(t)
  }
  return Math.ceil(JSON.stringify(part).length / 4)
}

export function msgTokens(msg) {
  return (Array.isArray(msg.parts) ? msg.parts : []).reduce((s, p) => s + partTokens(p), 0)
}

export function totalTokens(messages) {
  return (Array.isArray(messages) ? messages : []).reduce((s, m) => s + msgTokens(m), 0)
}

/**
 * Select oldest messages to remove.
 * Returns array of { id, msg, tokens } without mutating the input.
 * Never removes index 0 (system prompt) or the last message (latest turn).
 *
 * mode "auto":          remove just enough to bring total under maxLimit
 * mode "compress":      remove everything down to floor (deep prune)
 *
 * targetOverride: when set, replaces floor/minFloor — agent explicit request
 *   overrides the soft config defaults. Used when user asks "compress to X".
 *
 * turnProtectionTags: optional set of message IDs to protect from pruning.
 *   These are recent tool call message IDs that should be kept.
 */
export function selectMessagesToReap(messages, maxLimit, minFloor, mode = "auto", targetOverride, turnProtectionTags) {
  if (!messages?.length || messages.length < 3) return []

  const protectSet = turnProtectionTags?.length ? new Set(turnProtectionTags) : null

  let total = totalTokens(messages)
  const selected = []

  if (mode === "compress") {
    const floor = targetOverride ?? minFloor
    const tokenCache = messages.map((msg, i) => ({ idx: i, tokens: msgTokens(msg) }))
    let i = 1
    while (i < messages.length - 1) {
      if (protectSet?.has(String(messages[i].info?.id ?? i))) { i++; continue }
      const t = tokenCache[i].tokens
      if (total - t < floor) break
      total -= t
      selected.push({ id: String(messages[i].info?.id ?? i), msg: messages[i], tokens: t })
      i++
    }
  } else {
    const floor = targetOverride ?? minFloor
    const tokenCache = messages.map((msg, i) => ({ idx: i, tokens: msgTokens(msg) }))
    let i = 1
    while (i < messages.length - 1 && total > maxLimit) {
      if (protectSet?.has(String(messages[i].info?.id ?? i))) { i++; continue }
      const t = tokenCache[i].tokens
      if (total - t < floor) break
      total -= t
      selected.push({ id: String(messages[i].info?.id ?? i), msg: messages[i], tokens: t })
      i++
    }
  }

  return selected
}
