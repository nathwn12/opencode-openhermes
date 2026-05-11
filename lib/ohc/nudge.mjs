const NUDGE_HIGH = "[OHC] Context critically high. Oldest messages will be pruned if limit exceeded. Use `compress` now."
const NUDGE_MED = "[OHC] Context high. Proactive compression recommended. Run `compress` to free space."
const NUDGE_LOW = "[OHC] Context filling up. Consider using `compress`."
const NUDGE_ITERATION = "[OHC] Many iterations since last user message. Consider summarizing completed work with `compress`."

export function buildContextNudge(pct, max) {
  if (pct > 0.95) return NUDGE_HIGH
  if (pct > 0.85) return NUDGE_MED
  if (pct > 0.70) return NUDGE_LOW
  return null
}

export function injectNudges(state, config, messages) {
  const max = config.max
  const pct = estimateTokenPercent(messages, max)
  if (pct === null) return

  const nudge = buildContextNudge(pct, max)
  if (!nudge) return

  const changed = addNudgeAnchor(state, messages, pct)
  if (!changed) return

  appendNudgeToAssistant(messages, nudge)
}

function estimateTokenPercent(messages, max) {
  if (!messages?.length || !max) return null
  let total = 0
  for (const msg of messages) {
    if (!Array.isArray(msg.parts)) continue
    for (const part of msg.parts) {
      if (part.type === "text") total += Math.ceil((part.text || "").length / 4)
      else if (part.type === "tool") {
        if (part.state?.input) total += JSON.stringify(part.state.input).length / 4
        if (part.state?.output) {
          total += (typeof part.state.output === "string" ? part.state.output : JSON.stringify(part.state.output ?? "")).length / 4
        }
      }
    }
  }
  return total / max
}

function addNudgeAnchor(state, messages, pct) {
  const lastMsg = messages[messages.length - 1]
  if (!lastMsg) return false

  const lastId = lastMsg.info?.id
  if (!lastId) return false

  if (state.prunedIds.size > 0) {
    const currentIds = new Set(messages.map(m => m.info?.id).filter(Boolean))
    if ([...state.prunedIds].every(id => !currentIds.has(id))) {
      state.nudges.contextLimitAnchors.clear()
    }
  }

  if (state.nudges.contextLimitAnchors.has(lastId)) return false

  const freq = config.compress?.nudgeFrequency ?? 5
  if (state.nudges.contextLimitAnchors.size > 0 && state.nudges.contextLimitAnchors.size % freq !== 0) return false

  state.nudges.contextLimitAnchors.add(lastId)
  return Math.abs(pct - state.lastNudgePct) > 0.05
}

function appendNudgeToAssistant(messages, nudge) {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i]
    if (m.info?.role === "assistant" && Array.isArray(m.parts)) {
      const textPart = m.parts.find(p => p.type === "text")
      if (textPart) {
        textPart.text += "\n\n" + nudge
        return
      }
    }
  }
}
