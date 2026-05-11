export function syncCompressionBlocks(state, messages) {
  const ms = state.prune.messages
  if (!ms?.blocksById?.size) return

  const messageIds = new Set()
  for (const msg of messages) {
    if (msg.info?.id) messageIds.add(msg.info.id)
  }

  const prevActive = new Set(ms.activeBlockIds)

  ms.activeBlockIds.clear()
  ms.activeByAnchorMessageId?.clear()

  const now = Date.now()
  const ordered = [...ms.blocksById.values()].sort(
    (a, b) => (a.createdAt || 0) - (b.createdAt || 0) || a.blockId - b.blockId,
  )

  for (const block of ordered) {
    const hasOrigin = typeof block.compressMessageId === "string" &&
      block.compressMessageId.length > 0 &&
      messageIds.has(block.compressMessageId)

    if (!hasOrigin) {
      block.active = false
      block.deactivatedAt = now
      continue
    }

    if (block.deactivatedByUser) {
      block.active = false
      if (block.deactivatedAt === undefined) block.deactivatedAt = now
      continue
    }

    const consumed = Array.isArray(block.consumedBlockIds) ? block.consumedBlockIds : []
    for (const cid of consumed) {
      if (!ms.activeBlockIds.has(cid)) continue
      const cb = ms.blocksById.get(cid)
      if (cb) {
        cb.active = false
        cb.deactivatedAt = now
        cb.deactivatedByBlockId = block.blockId
      }
      ms.activeBlockIds.delete(cid)
    }

    block.active = true
    block.deactivatedAt = undefined
    block.deactivatedByBlockId = undefined
    ms.activeBlockIds.add(block.blockId)
  }

  for (const entry of ms.byMessageId.values()) {
    const all = Array.isArray(entry.allBlockIds)
      ? [...new Set(entry.allBlockIds.filter(id => Number.isInteger(id) && id > 0))]
      : []
    entry.allBlockIds = all
    entry.activeBlockIds = all.filter(id => ms.activeBlockIds.has(id))
  }

  let deactivated = 0
  let reactivated = 0
  for (const id of prevActive) { if (!ms.activeBlockIds.has(id)) deactivated++ }
  for (const id of ms.activeBlockIds) { if (!prevActive.has(id)) reactivated++ }

  return { deactivated, reactivated }
}
