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
    consumedBlockIds: Array.isArray(consumedBlockIds) ? consumedBlockIds : [],
    deactivatedByBlockId: undefined,
    deactivatedByUser: false,
    deactivatedAt: undefined,
    createdAt: Date.now(),
  }

  ms.blocksById.set(blockId, block)
  ms.activeBlockIds.add(blockId)

  if (anchorMessageId) {
    ms.activeByAnchorMessageId.set(anchorMessageId, blockId)
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

  for (const cid of consumedBlockIds) {
    const cb = ms.blocksById.get(cid)
    if (cb) {
      cb.active = false
      cb.deactivatedAt = Date.now()
      cb.deactivatedByBlockId = blockId
      ms.activeBlockIds.delete(cid)
    }
  }

  return block
}
