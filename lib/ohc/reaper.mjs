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

export function selectMessagesToReap(messages, maxLimit, minFloor, mode = "auto", targetOverride) {
  if (!messages?.length || messages.length < 3) return []

  let total = totalTokens(messages)
  const selected = []

  if (mode === "compress") {
    const floor = targetOverride ?? minFloor
    const tokenCache = messages.map((msg, i) => ({ idx: i, tokens: msgTokens(msg) }))
    let i = 1
    while (i < messages.length - 1) {
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
      const t = tokenCache[i].tokens
      if (total - t < floor) break
      total -= t
      selected.push({ id: String(messages[i].info?.id ?? i), msg: messages[i], tokens: t })
      i++
    }
  }

  return selected
}
