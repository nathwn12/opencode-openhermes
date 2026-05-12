import { isToolNameProtected } from "./protected-patterns.mjs"

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

export async function filterCompressedBlocks(state, messages, config, client) {
  const ms = state.prune?.messages
  if (!ms || !ms.activeBlockIds?.size || !ms.blocksById?.size) return { removed: 0, injected: 0 }

  const coveredMessageIds = new Set()
  for (const [rawId, entry] of ms.byMessageId) {
    const hasActive = Array.isArray(entry.activeBlockIds) && entry.activeBlockIds.some(id => ms.activeBlockIds.has(id))
    if (hasActive) coveredMessageIds.add(rawId)
  }

  if (!coveredMessageIds.size) return { removed: 0, injected: 0 }

  const activeBlocks = [...ms.activeBlockIds].map(id => ms.blocksById.get(id)).filter(Boolean)

  const messageById = new Map()
  for (const msg of messages) {
    if (msg.info?.id) messageById.set(msg.info.id, msg)
  }

  for (const block of activeBlocks) {
    const preserved = []

    for (const [rawId, entry] of ms.byMessageId) {
      if (!coveredMessageIds.has(rawId)) continue
      const msg = messageById.get(rawId)
      if (!msg) continue

      const inThisBlock = Array.isArray(entry.activeBlockIds) && entry.activeBlockIds.includes(block.blockId)
      if (!inThisBlock) continue

      if (Array.isArray(msg.parts)) {
        for (const part of msg.parts) {
          if (part.type !== "tool" || !part.state?.output) continue
          if (isToolNameProtected(part.tool)) {
            let out = String(part.state.output).slice(0, 500)
            if (part.tool === "task" && client && part.state?.status === "completed") {
              const cached = state.subAgentResultCache?.get(part.callID)
              if (cached === undefined) {
                try {
                  const outputStr = typeof part.state.output === "string" ? part.state.output : JSON.stringify(part.state.output || "")
                  const sessionMatch = outputStr.match(/<ohc-ref>ses_([^<]+)<\/ohc-ref>/)
                  if (sessionMatch) {
                    const subSessionId = sessionMatch[1]
                    const subRes = await client.session.messages({ path: { id: subSessionId } })
                    const subMsgs = subRes?.data || subRes || []
                    const lastAssistant = [...subMsgs].reverse().find(m => m.info?.role === "assistant")
                    if (lastAssistant) {
                      const textParts = (lastAssistant.parts || [])
                        .filter(p => p.type === "text")
                        .map(p => String(p.text).slice(0, 1000))
                      if (textParts.length) {
                        const result = textParts.join("\n")
                        state.subAgentResultCache?.set(part.callID, result)
                        out += "\n\n[Sub-agent result]:\n" + result
                      } else {
                        state.subAgentResultCache?.set(part.callID, "")
                      }
                    } else {
                      state.subAgentResultCache?.set(part.callID, "")
                    }
                  } else {
                    state.subAgentResultCache?.set(part.callID, "")
                  }
                } catch {
                  state.subAgentResultCache?.set(part.callID, "")
                }
              } else if (cached) {
                out += "\n\n[Sub-agent result]:\n" + cached
              }
            }
            preserved.push(`[${part.tool} output]: ${out}`)
          }
        }
      }

      if (config?.compress?.protectUserMessages && msg.info?.role === "user") {
        const texts = (Array.isArray(msg.parts) ? msg.parts : [])
          .filter(p => p.type === "text" && p.text)
          .map(p => String(p.text).slice(0, 300))
        if (texts.length) {
          preserved.push(`[User message]: ${texts.join(" ")}`)
        }
      }
    }

    if (preserved.length > 0) {
      block.summary += "\n\n---\nPreserved:\n" + preserved.join("\n\n")
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
        const blockId = ms.activeByAnchorMessageId.get(mid)
        const block = blockId ? ms.blocksById.get(blockId) : null
        if (block) {
          const origMsg = messageById.get(mid)
          const sessionID = origMsg?.info?.sessionID || ""
          const time = origMsg?.info?.time?.created || Date.now()

          result.push({
            parts: [{ type: "text", text: block.summary }],
            info: {
              role: "user",
              sessionID,
              time: { created: time },
              summary: true,
            },
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
