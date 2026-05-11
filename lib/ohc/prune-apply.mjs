const PRUNED_OUTPUT_PLACEHOLDER = "[Output removed — information superseded or no longer needed]"
const PRUNED_ERROR_INPUT_PLACEHOLDER = "[input removed — failed tool call]"
const PRUNED_QUESTION_INPUT_PLACEHOLDER = "[questions removed — see output for answers]"

export function applyPruneTools(state, messages) {
  if (!state.prune.tools.size) return 0

  let prunedCount = 0

  for (const msg of messages) {
    if (!Array.isArray(msg.parts)) continue

    for (const part of msg.parts) {
      if (part.type !== "tool" || !part.callID) continue
      if (!state.prune.tools.has(part.callID)) continue

      prunedCount++

      if (part.state?.status === "completed") {
        if (part.tool === "question") {
          if (part.state.input?.questions !== undefined) {
            part.state.input.questions = PRUNED_QUESTION_INPUT_PLACEHOLDER
          }
        } else if (part.tool !== "edit" && part.tool !== "write") {
          part.state = {
            ...part.state,
            output: PRUNED_OUTPUT_PLACEHOLDER,
          }
        }
      }

      if (part.state?.status === "error") {
        const input = part.state.input
        if (input && typeof input === "object") {
          for (const key of Object.keys(input)) {
            if (typeof input[key] === "string") {
              input[key] = PRUNED_ERROR_INPUT_PLACEHOLDER
            }
          }
        }
      }
    }
  }

  return prunedCount
}

export function filterCompressedBlocks(state, messages) {
  const ms = state.prune?.messages
  if (!ms || !ms.activeBlockIds?.size || !ms.blocksById?.size) return { removed: 0, injected: 0 }

  const coveredMessageIds = new Set()
  for (const [rawId, entry] of ms.byMessageId) {
    const hasActive = Array.isArray(entry.activeBlockIds) && entry.activeBlockIds.some(id => ms.activeBlockIds.has(id))
    if (hasActive) coveredMessageIds.add(rawId)
  }

  if (!coveredMessageIds.size) return { removed: 0, injected: 0 }

  const activeBlocks = [...ms.activeBlockIds].map(id => ms.blocksById.get(id)).filter(Boolean)
  const summaryByAnchor = new Map()
  for (const block of activeBlocks) {
    if (block.anchorMessageId && !summaryByAnchor.has(block.anchorMessageId)) {
      summaryByAnchor.set(block.anchorMessageId, block)
    }
  }

  let removed = 0
  let injected = 0
  const result = []
  const blocksDeployed = new Set()

  for (const msg of messages) {
    const mid = msg.info?.id

    if (mid && coveredMessageIds.has(mid)) {
      if (!blocksDeployed.has(mid)) {
        blocksDeployed.add(mid)
        const block = summaryByAnchor.get(mid)
        if (block) {
          result.push({
            parts: [{ type: "text", text: block.summary }],
            info: { role: "system" },
          })
          injected++
        }
      }
      removed++
      continue
    }

    result.push(msg)
  }

  messages.length = 0
  messages.push(...result)

  return { removed, injected }
}

export function applyFullToolRemoval(state, messages) {
  if (!state.prune.tools.size) return 0

  const removed = []

  for (const msg of messages) {
    if (!Array.isArray(msg.parts)) continue

    const toRemove = []
    for (const part of msg.parts) {
      if (part.type !== "tool" || !part.callID) continue
      if (!state.prune.tools.has(part.callID)) continue
      if (part.tool !== "edit" && part.tool !== "write") continue
      toRemove.push(part.callID)
    }

    if (!toRemove.length) continue

    const before = msg.parts.length
    msg.parts = msg.parts.filter(p => p.type !== "tool" || !toRemove.includes(p.callID))
    const after = msg.parts.length
    if (after === 0 && before > 0) {
      removed.push(msg.info.id)
    }
  }

  if (removed.length) {
    const result = messages.filter(m => !removed.includes(m.info.id))
    messages.length = 0
    messages.push(...result)
  }

  return removed.length
}
