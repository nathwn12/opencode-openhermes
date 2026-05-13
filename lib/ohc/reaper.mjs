import { countTokens } from "./tokenizer.mjs"

function partTokens(part) {
  if (part.type === "text") return countTokens(part.text || "")
  if (part.type === "tool") {
    let t = 0
    if (part.state?.input) t += countTokens(JSON.stringify(part.state.input))
    if (part.state?.output)
      t += countTokens(typeof part.state.output === "string" ? part.state.output : JSON.stringify(part.state.output ?? ""))
    return Math.ceil(t)
  }
  try { return countTokens(JSON.stringify(part)) } catch { return 0 }
}

export function msgTokens(msg) {
  return (Array.isArray(msg.parts) ? msg.parts : []).reduce((s, p) => s + partTokens(p), 0)
}

export function totalTokens(messages) {
  return (Array.isArray(messages) ? messages : []).reduce((s, m) => s + msgTokens(m), 0)
}

function computeTurnByIndex(messages) {
  const turns = []
  let turn = 0
  for (const msg of messages) {
    if (msg.info?.role === "user") {
      const hasText = Array.isArray(msg.parts) && msg.parts.some(p => p.type === "text" && p.text?.trim())
      if (hasText) turn++
    }
    turns.push(turn)
  }
  return turns
}

export function selectMessagesToReap(messages, maxLimit, minFloor, mode = "auto", targetOverride, protectTurns = 2) {
  if (!messages?.length || messages.length < 3) return []

  let total = totalTokens(messages)
  const selected = []
  const turns = computeTurnByIndex(messages)
  const maxTurn = turns.length > 0 ? Math.max(...turns) : 0
  const protectedMinTurn = Math.max(1, maxTurn - protectTurns + 1)

  function isProtected(idx) {
    return turns[idx] >= protectedMinTurn
  }

  if (mode === "compress") {
    const floor = targetOverride ?? minFloor
    const tokenCache = messages.map((msg, i) => ({ idx: i, tokens: msgTokens(msg) }))
    let i = 1
    while (i < messages.length - 1) {
      if (isProtected(i)) { i++; continue }
      if (!messages[i]?.info?.id) { i++; continue }
      const t = tokenCache[i].tokens
      if (total - t < floor) break
      total -= t
      selected.push({ id: String(messages[i].info.id), msg: messages[i], tokens: t })
      i++
    }
  } else {
    const floor = targetOverride ?? minFloor
    const tokenCache = messages.map((msg, i) => ({ idx: i, tokens: msgTokens(msg) }))
    let i = 1
    while (i < messages.length - 1 && total > maxLimit) {
      if (isProtected(i)) { i++; continue }
      if (!messages[i]?.info?.id) { i++; continue }
      const t = tokenCache[i].tokens
      if (total - t < floor) break
      total -= t
      selected.push({ id: String(messages[i].info.id), msg: messages[i], tokens: t })
      i++
    }
  }

  return selected
}
