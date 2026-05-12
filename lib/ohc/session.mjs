import { loadOhcState, saveOhcState, serializeState, resetOhcState, deserializeState } from "./state.mjs"

export function checkSession(state, messages) {
  const sessionId = getSessionIdFromMessages(messages)
  if (!sessionId) return { sessionChanged: false, compacted: false }

  if (state.sessionId !== null && state.sessionId !== sessionId) {
    resetOhcState(state)
    state.sessionId = sessionId
    state.isSubAgent = false
    state._subAgentChecked = false

    const persisted = loadOhcState(sessionId)
    if (persisted) {
      const restored = deserializeState(persisted)
      Object.assign(state, restored)
    }

    return { sessionChanged: true, compacted: false }
  }

  if (state.sessionId === null) {
    state.sessionId = sessionId
    return { sessionChanged: true, compacted: false }
  }

  const compacted = detectCompaction(messages, state.lastCompaction)
  if (compacted) {
    resetOhcState(state)
    state.lastCompaction = Date.now()
    saveOhcState(sessionId, serializeState(state))
    return { sessionChanged: false, compacted: true }
  }

  return { sessionChanged: false, compacted: false }
}

function getSessionIdFromMessages(messages) {
  if (!Array.isArray(messages) || !messages.length) return null
  for (const msg of messages) {
    if (msg?.info?.sessionID && typeof msg.info.sessionID === "string") {
      return msg.info.sessionID
    }
  }
  return null
}

function detectCompaction(messages, lastCompaction) {
  if (!Array.isArray(messages)) return false
  for (const msg of messages) {
    if (
      msg?.info?.role === "assistant" &&
      msg.info.summary === true
    ) {
      const ts = msg.info.time?.created
      if (ts && ts > lastCompaction) return true
    }
  }
  return false
}
