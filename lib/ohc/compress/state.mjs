export function allocateBlockId(state) {
  const ms = state.prune.messages
  const id = ms.nextBlockId
  ms.nextBlockId++
  return id
}

export function allocateRunId(state) {
  const ms = state.prune.messages
  const id = ms.nextRunId
  ms.nextRunId++
  return id
}

export function wrapBlockSummary(blockId, summary) {
  return `[Compressed bk${blockId}]\n\n${summary}\n<ohc-ref>bk${blockId}</ohc-ref>`
}

export function applyCompressionState(state, input, selection, anchorMessageId, blockId, storedSummary, consumedBlockIds) {
  const ms = state.prune.messages
  const consumed = [...new Set((consumedBlockIds || []).filter(id => Number.isInteger(id) && id > 0))]
  const included = [...consumed]

  const effectiveMessageIds = new Set(selection.messageIds)
  const effectiveToolIds = new Set(selection.toolIds)

  for (const cid of consumed) {
    const cb = ms.blocksById.get(cid)
    if (cb) {
      if (Array.isArray(cb.effectiveMessageIds)) {
        for (const mid of cb.effectiveMessageIds) effectiveMessageIds.add(mid)
      }
      if (Array.isArray(cb.effectiveToolIds)) {
        for (const tid of cb.effectiveToolIds) effectiveToolIds.add(tid)
      }
    }
  }

  const createdAt = Date.now()
  const block = {
    blockId,
    active: true,
    topic: input.topic,
    batchTopic: input.batchTopic || input.topic,
    mode: input.mode || "range",
    runId: input.runId,
    compressMessageId: input.compressMessageId,
    compressCallId: input.compressCallId || null,
    anchorMessageId,
    startId: input.startId,
    endId: input.endId,
    summary: storedSummary,
    summaryTokens: input.summaryTokens || 0,
    compressedTokens: input.compressedTokens || 0,
    consumedBlockIds: consumed,
    includedBlockIds: included,
    parentBlockIds: [],
    directMessageIds: [],
    directToolIds: [],
    effectiveMessageIds: [...effectiveMessageIds],
    effectiveToolIds: [...effectiveToolIds],
    deactivatedByBlockId: undefined,
    deactivatedByUser: false,
    deactivatedAt: undefined,
    createdAt,
  }

  ms.blocksById.set(blockId, block)
  ms.activeBlockIds.add(blockId)

  if (anchorMessageId) {
    ms.activeByAnchorMessageId.set(anchorMessageId, blockId)
  }

  const deactivatedAt = Date.now()
  for (const cid of consumed) {
    const cb = ms.blocksById.get(cid)
    if (cb && cb.active) {
      cb.active = false
      cb.deactivatedAt = deactivatedAt
      cb.deactivatedByBlockId = blockId
      if (!cb.parentBlockIds.includes(blockId)) {
        cb.parentBlockIds.push(blockId)
      }
      ms.activeBlockIds.delete(cid)
      if (cb.anchorMessageId && ms.activeByAnchorMessageId.get(cb.anchorMessageId) === cid) {
        ms.activeByAnchorMessageId.delete(cb.anchorMessageId)
      }
    }
  }

  for (const rawMessageId of selection.messageIds) {
    let entry = ms.byMessageId.get(rawMessageId)
    if (!entry) {
      entry = { tokenCount: 0, allBlockIds: [], activeBlockIds: [] }
      ms.byMessageId.set(rawMessageId, entry)
    }
    if (!entry.allBlockIds.includes(blockId)) {
      entry.allBlockIds.push(blockId)
    }
    if (!entry.activeBlockIds.includes(blockId)) {
      entry.activeBlockIds.push(blockId)
    }
  }

  for (const mid of effectiveMessageIds) {
    if (selection.messageIds.includes(mid)) continue
    const existing = ms.byMessageId.get(mid)
    if (existing) {
      if (!existing.allBlockIds.includes(blockId)) {
        existing.allBlockIds.push(blockId)
      }
      if (!existing.activeBlockIds.includes(blockId)) {
        existing.activeBlockIds.push(blockId)
      }
    }
  }

  for (const cid of consumed) {
    const cb = ms.blocksById.get(cid)
    if (!cb) continue
    for (const mid of cb.effectiveMessageIds) {
      const entry = ms.byMessageId.get(mid)
      if (entry) {
        entry.activeBlockIds = entry.activeBlockIds.filter(id => id !== cid)
      }
    }
  }

  block.directMessageIds = [...effectiveMessageIds]
  block.directToolIds = [...effectiveToolIds]

  return block
}
