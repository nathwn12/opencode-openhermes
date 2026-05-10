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

function msgTokens(msg) {
  return (Array.isArray(msg.parts) ? msg.parts : []).reduce((s, p) => s + partTokens(p), 0)
}

export function reap(messages, maxLimit, minFloor) {
  if (!messages?.length || messages.length < 3) return 0

  let total = messages.reduce((s, m) => s + msgTokens(m), 0)
  let removed = 0

  let i = 1
  while (i < messages.length - 1 && total > maxLimit) {
    const t = msgTokens(messages[i])
    if (total - t < minFloor) break
    total -= t
    messages.splice(i, 1)
    removed++
  }

  return removed
}
