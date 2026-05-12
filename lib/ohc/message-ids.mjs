const MESSAGE_REF_REGEX = /^ohc(\d{4})$/
const BLOCK_REF_REGEX = /^bk([1-9]\d*)$/
const OHCTAG = "ohc-ref"

export function formatMessageRef(index) {
  if (!Number.isInteger(index) || index < 1 || index > 9999) {
    throw new Error(`OHC ref index out of bounds: ${index}`)
  }
  return `ohc${index.toString().padStart(4, "0")}`
}

export function formatBlockRef(blockId) {
  if (!Number.isInteger(blockId) || blockId < 1) {
    throw new Error(`Invalid block ID: ${blockId}`)
  }
  return `bk${blockId}`
}

export function parseMessageRef(ref) {
  const m = (ref || "").trim().toLowerCase().match(MESSAGE_REF_REGEX)
  if (!m) return null
  const idx = parseInt(m[1], 10)
  return Number.isInteger(idx) && idx >= 1 && idx <= 9999 ? idx : null
}

export function parseBlockRef(ref) {
  const m = (ref || "").trim().toLowerCase().match(BLOCK_REF_REGEX)
  if (!m) return null
  const id = parseInt(m[1], 10)
  return Number.isInteger(id) ? id : null
}

export function parseBoundaryId(id) {
  const norm = (id || "").trim().toLowerCase()
  const msgIdx = parseMessageRef(norm)
  if (msgIdx !== null) {
    return { kind: "message", ref: formatMessageRef(msgIdx), index: msgIdx }
  }
  const bkId = parseBlockRef(norm)
  if (bkId !== null) {
    return { kind: "compressed-block", ref: formatBlockRef(bkId), blockId: bkId }
  }
  return null
}

function escapeXml(s) {
  return String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
}

export function formatOhcTag(ref, attrs) {
  const serialized = Object.entries(attrs || {})
    .filter(([, v]) => typeof v === "string" && v.length > 0)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => ` ${k}="${escapeXml(v)}"`)
    .join("")
  return `\n<${OHCTAG}${serialized}>${ref}</${OHCTAG}>`
}

export function isIgnoredUserMessage(message) {
  if (!message?.info || message.info.role !== "user") return false
  const parts = Array.isArray(message.parts) ? message.parts : []
  if (parts.length === 0) return true
  return parts.every(p => p.ignored)
}

export function assignMessageRefs(state, messages) {
  let assigned = 0
  let skippedFirstUser = false

  for (const msg of messages) {
    if (!msg || typeof msg !== "object") continue
    if (!msg.info || typeof msg.info !== "object") continue
    if (isIgnoredUserMessage(msg)) continue

    const role = msg.info.role
    if (role !== "user" && role !== "assistant") continue

    if (state.isSubAgent && !skippedFirstUser && role === "user") {
      skippedFirstUser = true
      continue
    }

    const rawId = msg.info?.id
    if (typeof rawId !== "string" || !rawId) continue

    const existing = state.messageIds.byRawId.get(rawId)
    if (existing) {
      if (state.messageIds.byRef.get(existing) !== rawId) {
        state.messageIds.byRef.set(existing, rawId)
      }
      continue
    }

    const ref = allocateNextRef(state)
    state.messageIds.byRawId.set(rawId, ref)
    state.messageIds.byRef.set(ref, rawId)
    assigned++
  }

  return assigned
}

function allocateNextRef(state) {
  let candidate = Number.isInteger(state.messageIds.nextRef)
    ? Math.max(1, state.messageIds.nextRef)
    : 1

  for (let attempt = 0; attempt < 9999; attempt++) {
    if (candidate > 9999) candidate = 1
    const ref = formatMessageRef(candidate)
    if (!state.messageIds.byRef.has(ref)) {
      state.messageIds.nextRef = candidate + 1
      return ref
    }
    candidate++
  }

  state.messageIds.nextRef = 1
  return formatMessageRef(1)
}

export function cleanupMessageRefs(state, removedRawIds) {
  for (const rawId of removedRawIds) {
    const ref = state.messageIds.byRawId.get(rawId)
    if (ref) {
      state.messageIds.byRawId.delete(rawId)
      state.messageIds.byRef.delete(ref)
    }
  }
}

export function injectMessageIds(state, messages) {
  for (const msg of messages) {
    if (!msg?.info) continue
    const role = msg.info.role
    if (role !== "user" && role !== "assistant") continue
    if (isIgnoredUserMessage(msg)) continue
    const msgRef = state.messageIds.byRawId.get(msg.info.id)
    if (!msgRef) continue
    const tag = formatOhcTag(msgRef)

    if (role === "user") {
      let injected = false
      if (Array.isArray(msg.parts)) {
        for (const part of msg.parts) {
          if (part.type === "text") {
            part.text += tag
            injected = true
            break
          }
        }
        if (!injected) {
          msg.parts.push({ type: "text", text: tag })
        }
      }
      continue
    }

    if (!Array.isArray(msg.parts)) continue

    let hasContent = msg.parts.some(p => p.type === "text" || p.type === "tool")
    if (!hasContent) continue

    let injected = false
    for (const part of msg.parts) {
      if (part.type !== "tool" || typeof part.state?.output !== "string") continue
      part.state.output = (part.state.output || "") + tag
      injected = true
      break
    }

    if (injected) continue

    const lastText = [...msg.parts].reverse().find(p => p.type === "text")
    if (lastText) {
      lastText.text += tag
      continue
    }

    const firstToolIdx = msg.parts.findIndex(p => p.type === "tool")
    const synth = { type: "text", text: tag }
    if (firstToolIdx === -1) {
      msg.parts.push(synth)
    } else {
      msg.parts.splice(firstToolIdx, 0, synth)
    }
  }
}
