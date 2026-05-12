import { parseBoundaryId, formatBlockRef } from "../message-ids.mjs"
import { msgTokens, totalTokens } from "../reaper.mjs"

export function buildSearchContext(state, rawMessages) {
  const rawMessagesById = new Map()
  const rawIndexById = new Map()

  for (const msg of rawMessages) {
    if (msg.info?.id) rawMessagesById.set(msg.info.id, msg)
  }
  for (let i = 0; i < rawMessages.length; i++) {
    const msg = rawMessages[i]
    if (msg?.info?.id) rawIndexById.set(msg.info.id, i)
  }

  const summaryByBlockId = new Map()
  const ms = state.prune?.messages
  if (ms?.blocksById) {
    for (const [blockId, block] of ms.blocksById) {
      if (block.active) summaryByBlockId.set(blockId, block)
    }
  }

  return { rawMessages, rawMessagesById, rawIndexById, summaryByBlockId }
}

export function resolveBoundaryIds(context, state, startId, endId) {
  const lookup = buildBoundaryLookup(context, state)

  const parsedStart = parseBoundaryId(startId)
  const parsedEnd = parseBoundaryId(endId)

  if (!parsedStart) throw new Error(`startId "${startId}" is invalid. Use ohcNNNN (message) or bkNN (block).`)
  if (!parsedEnd) throw new Error(`endId "${endId}" is invalid. Use ohcNNNN (message) or bkNN (block).`)

  const startRef = lookup.get(parsedStart.ref)
  const endRef = lookup.get(parsedEnd.ref)

  if (!startRef) throw new Error(`startId ${parsedStart.ref} not found in context.`)
  if (!endRef) throw new Error(`endId ${parsedEnd.ref} not found in context.`)

  if (startRef.rawIndex > endRef.rawIndex) {
    throw new Error(`startId ${parsedStart.ref} appears after endId ${parsedEnd.ref}. Start must come before end.`)
  }

  return { startReference: startRef, endReference: endRef }
}

function buildBoundaryLookup(context, state) {
  const lookup = new Map()

  for (const [msgRef, rawId] of state.messageIds.byRef) {
    const rawMsg = context.rawMessagesById.get(rawId)
    if (!rawMsg) continue

    const rawIndex = context.rawIndexById.get(rawId)
    if (rawIndex === undefined) continue

    lookup.set(msgRef, { kind: "message", rawIndex, messageId: rawId })
  }

  const summaries = Array.from(context.summaryByBlockId.values()).sort((a, b) => a.blockId - b.blockId)
  for (const summary of summaries) {
    const anchorMsg = context.rawMessagesById.get(summary.anchorMessageId)
    if (!anchorMsg) continue

    const rawIndex = context.rawIndexById.get(summary.anchorMessageId)
    if (rawIndex === undefined) continue

    const bkRef = formatBlockRef(summary.blockId)
    if (!lookup.has(bkRef)) {
      lookup.set(bkRef, {
        kind: "compressed-block",
        rawIndex,
        blockId: summary.blockId,
        anchorMessageId: summary.anchorMessageId,
      })
    }
  }

  return lookup
}

export function resolveSelection(context, startReference, endReference) {
  const messageIds = []
  const messageSeen = new Set()
  const toolIds = []
  const toolSeen = new Set()
  const requiredBlockIds = []
  const requiredBlockSeen = new Set()
  const messageTokenById = new Map()

  for (let i = startReference.rawIndex; i <= endReference.rawIndex; i++) {
    const msg = context.rawMessages[i]
    if (!msg) continue

    const mid = msg.info?.id
    if (mid && !messageSeen.has(mid)) {
      messageSeen.add(mid)
      messageIds.push(mid)
      messageTokenById.set(mid, msgTokens(msg))
    }

    const parts = Array.isArray(msg.parts) ? msg.parts : []
    for (const part of parts) {
      if (part.type !== "tool" || !part.callID || toolSeen.has(part.callID)) continue
      toolSeen.add(part.callID)
      toolIds.push(part.callID)
    }
  }

  const selectedIds = new Set(messageIds)
  const summariesInRange = []
  for (const block of context.summaryByBlockId.values()) {
    if (!selectedIds.has(block.anchorMessageId)) continue
    const idx = context.rawIndexById.get(block.anchorMessageId)
    if (idx === undefined) continue
    summariesInRange.push({ blockId: block.blockId, rawIndex: idx })
  }

  summariesInRange.sort((a, b) => a.rawIndex - b.rawIndex || a.blockId - b.blockId)
  for (const s of summariesInRange) {
    if (!requiredBlockSeen.has(s.blockId)) {
      requiredBlockSeen.add(s.blockId)
      requiredBlockIds.push(s.blockId)
    }
  }

  if (messageIds.length === 0) {
    throw new Error("No messages found in the specified range.")
  }

  return { startReference, endReference, messageIds, toolIds, requiredBlockIds, messageTokenById }
}

export function resolveAnchorMessageId(startReference) {
  if (startReference.kind === "compressed-block") {
    if (!startReference.anchorMessageId) throw new Error("Compressed block has no anchor message ID")
    return startReference.anchorMessageId
  }
  if (!startReference.messageId) throw new Error("No message ID in start reference")
  return startReference.messageId
}

export function validateNonOverlapping(ranges) {
  const sorted = [...ranges].sort((a, b) => a.selection.startReference.rawIndex - b.selection.startReference.rawIndex)
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1]
    const curr = sorted[i]
    if (curr.selection.startReference.rawIndex <= prev.selection.endReference.rawIndex) {
      throw new Error(`content[${prev.index}] (${prev.entry.startId}..${prev.entry.endId}) overlaps content[${curr.index}] (${curr.entry.startId}..${curr.entry.endId}).`)
    }
  }
}
