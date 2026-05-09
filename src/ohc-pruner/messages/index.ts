import { allocateMessageRef, COMPRESSED_BLOCK_HEADER } from "../state.js"
import type { SessionState } from "../state.js"
import type { PluginConfig } from "../config.js"
import { resolveLimit } from "../config.js"

export function getMessageId(msg: Record<string, unknown>): string {
  const info = msg.info as Record<string, unknown> | undefined
  return (info?.ohcRef as string) || (info?.id as string) || (msg.id as string) || (msg.messageId as string) || ""
}

export function setMessageId(msg: Record<string, unknown>, id: string): void {
  const info = msg.info as Record<string, unknown> | undefined
  if (!info) {
    (msg as any).info = {} as Record<string, unknown>
  }
  ;((msg as any).info as Record<string, unknown>).ohcRef = id
}

export function getRole(msg: Record<string, unknown>): string {
  return (msg.info as Record<string, unknown>)?.role as string || msg.role as string || ""
}

export function isUserTurn(messages: unknown[]): boolean {
  for (let i = messages.length - 1; i >= 0; i--) {
    const role = getRole(messages[i] as Record<string, unknown>)
    if (role === "user") return true
    if (role === "assistant") return false
  }
  return false
}

export function sinceLastUser(messages: unknown[]): number {
  let count = 0
  for (let i = messages.length - 1; i >= 0; i--) {
    if (getRole(messages[i] as Record<string, unknown>) === "user") return count
    count++
  }
  return count
}

export function isSubAgentSession(messages: unknown[]): boolean {
  if (!Array.isArray(messages) || messages.length === 0) return false
  const firstText = extractText(messages[0] as Record<string, unknown>)
  return firstText.includes("You are a") || firstText.includes("subagent")
}

function extractText(msg: Record<string, unknown>): string {
  if (!Array.isArray(msg.parts)) return ""
  return (msg.parts as Array<Record<string, unknown>>).filter(p => p?.type === "text").map(p => (p.text as string) || "").join("\n")
}

export function assignMessageRefs(state: SessionState, messages: unknown[]): void {
  for (const msg of messages) {
    const m = msg as Record<string, unknown>
    const info = m.info as Record<string, unknown> | undefined
    const rawId = (info?.id as string) || (m.id as string) || (m.messageId as string) || ""
    const ref = allocateMessageRef(state)
    setMessageId(m, ref)
    if (rawId) {
      state.rawIdToRef.set(rawId, ref)
      state.refToRawId.set(ref, rawId)
    }
    state.messageIds.set(ref, msg)
  }
  state.cachedMessages = messages
}

export function injectMessageIds(state: SessionState, messages: unknown[]): void {
  if (!state.messageIds) state.messageIds = new Map()
  for (const msg of messages) {
    const id = getMessageId(msg as Record<string, unknown>)
    if (!id) continue
    state.messageIds.set(id, msg)

    const role = getRole(msg as Record<string, unknown>)
    if (!Array.isArray((msg as Record<string, unknown>).parts)) continue

    const tag = `[${id}]`
    const parts = (msg as Record<string, unknown>).parts as any[]

    if (role === "user") {
      let injected = false
      for (const part of parts) {
        if (part.type === "text") {
          part.text = tag + " " + part.text
          injected = true
          break
        }
      }
      if (!injected) {
        parts.unshift({ type: "text", text: tag })
      }
      continue
    }

    if (role !== "assistant") continue

    let hasContent = false
    for (const part of parts) {
      if (part.type === "text" || part.type === "tool") { hasContent = true; break }
    }
    if (!hasContent) continue

    let injected = false
    for (const part of parts) {
      if (part.type === "tool") {
        if (part.state?.output && typeof part.state.output === "string") {
          part.state.output = `${tag} ${part.state.output}`
          injected = true
        }
        break
      }
    }
    if (!injected) {
      for (const part of parts) {
        if (part.type === "text") {
          part.text = tag + " " + part.text
          injected = true
          break
        }
      }
    }
    if (!injected) {
      parts.push({ type: "text", text: tag })
    }
  }
}

export interface ToolIdEntry {
  id: string
  partIndex: number
  toolName: string
  status: string
}

export function buildToolIdList(state: SessionState, messages: unknown[]): void {
  const ids: ToolIdEntry[] = []
  let userTurns = 0
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i] as Record<string, unknown>
    if (getRole(msg) === "user") userTurns++
    if (userTurns <= 4 && Array.isArray(msg.parts)) {
      for (const part of msg.parts as any[]) {
        if (part?.type === "tool" && (part.state?.status === "completed" || part.state?.status === "error")) {
          ids.push({
            id: getMessageId(msg),
            partIndex: (msg.parts as Array<unknown>).indexOf(part),
            toolName: (part.tool || part.name || "") as string,
            status: part.state.status as string,
          })
        }
      }
    }
  }
  state.toolIdList = ids
}

export function deduplicateToolCalls(messages: unknown[], config: PluginConfig): number {
  if (!config.strategies?.deduplication?.enabled) return 0

  const protectedTools = new Set([
    ...(config.compress?.protectedTools || []),
    ...(config.strategies.deduplication?.protectedTools || []),
    "compress",
  ])
  const seen = new Map<string, boolean>()
  let count = 0

  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i] as Record<string, unknown>
    if (getRole(msg) !== "assistant" || !Array.isArray(msg.parts)) continue

    for (const part of msg.parts as any[]) {
      if (part?.type !== "tool") continue
      const toolName = (part.tool || part.name || "") as string
      if (!toolName || protectedTools.has(toolName)) continue
      if (part.state?.status && part.state.status !== "completed") continue

      const input = JSON.stringify(part.state?.input ?? part.input ?? {})
      const key = `${toolName}::${input}`

      if (seen.has(key)) {
        part._ohcPruned = true
        part._ohcToolName = toolName
        count++
      } else {
        seen.set(key, true)
      }
    }
  }

  for (const msg of messages as Array<Record<string, unknown>>) {
    if (!Array.isArray(msg.parts)) continue
    msg.parts = (msg.parts as any[]).map(p => {
      if (p?._ohcPruned) {
        const name = p._ohcToolName || "tool"
        delete p._ohcPruned
        delete p._ohcToolName
        return { type: "text", text: `[Pruned: duplicate ${name}]` }
      }
      return p
    })
  }

  return count
}

export function purgeErroredToolInputs(messages: unknown[], config: PluginConfig): number {
  if (!config.strategies?.purgeErrors?.enabled) return 0

  const protectedTools = new Set([
    ...(config.compress?.protectedTools || []),
    ...(config.strategies.purgeErrors?.protectedTools || []),
  ])
  const turns = Math.max(1, config.strategies.purgeErrors?.turns || 4)
  let userTurns = 0
  let count = 0

  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i] as Record<string, unknown>
    if (getRole(msg) === "user") userTurns++
    if (userTurns <= turns || !Array.isArray(msg.parts)) continue

    for (const part of msg.parts as any[]) {
      if (part?.type !== "tool" || part.state?.status !== "error") continue
      const toolName = (part.tool || part.name || "") as string
      if (toolName && protectedTools.has(toolName)) continue

      const input = part.state?.input ?? part.input
      if (input && typeof input === "object" && !Array.isArray(input)) {
        for (const key of Object.keys(input as Record<string, unknown>)) {
          if (typeof (input as Record<string, unknown>)[key] === "string") {
            (input as Record<string, unknown>)[key] = "[stripped - errored tool]"
            count++
          }
        }
      }
    }
  }

  return count
}

export function syncCompressionBlocks(state: SessionState, messages: unknown[], config?: PluginConfig): void {
  for (const block of state.blocks) {
    if (block.appliedAt) continue

    const existingIdx = (messages as Array<Record<string, unknown>>).findIndex(
      m => getMessageId(m) === `ohc-summary:${block.id}` || getMessageId(m) === `${COMPRESSED_BLOCK_HEADER}:${block.id}`
    )
    if (existingIdx >= 0) {
      block.appliedAt = Date.now()
      continue
    }

    const startIdx = (messages as Array<Record<string, unknown>>).findIndex(m => getMessageId(m) === block.startId)
    const endIdx = (messages as Array<Record<string, unknown>>).findIndex(m => getMessageId(m) === block.endId)
    if (startIdx === -1 || endIdx === -1 || endIdx < startIdx) continue

    const summaryMsg: Record<string, unknown> = {
      info: { id: `${COMPRESSED_BLOCK_HEADER}:${block.id}`, role: "system" },
      parts: [{ type: "text", text: `## OpenHermes Compression: ${block.topic}\n- Range: ${block.startId} -> ${block.endId}\n- Summary: ${block.summary}` }],
    }

    ;(messages as Array<Record<string, unknown>>).splice(startIdx, endIdx - startIdx + 1, summaryMsg)
    if (config?.compress?.protectUserMessages) {
      for (let i = startIdx; i <= endIdx; i++) {
        if (getRole((messages as Array<Record<string, unknown>>)[i]) === "user") {
          (messages as Array<Record<string, unknown>>).splice(i, 0, (messages as Array<Record<string, unknown>>)[i])
          i++
        }
      }
    }

    block.appliedAt = Date.now()
  }
}

export function buildCompressionNudge(tokens: number, maxContextLimit: number, mode: string, sinceLastUserCount: number): string {
  const pct = Math.round((tokens / Math.max(1, maxContextLimit)) * 100)
  const urgency = pct > 140 ? "CRITICAL" : pct > 100 ? "HIGH" : pct > 70 ? "MODERATE" : "LOW"
  const action = mode === "strong" || pct > 100
    ? "Run `compress` NOW with the built-in OpenHermes pruner. Do not proceed without compacting."
    : "Consider running `compress` with the built-in OpenHermes pruner on closed, stale, or dead-end conversation segments."

  return [
    `## OpenHermes Context Pruning (ohc-pruner, built-in OpenHermes dynamic context pruning)`,
    `- Mode: ${mode}. Token estimate: ~${tokens.toLocaleString()} (${pct}% of ${maxContextLimit.toLocaleString()} limit).`,
    `- Urgency: ${urgency}.`,
    action,
    `- Use range mode: \`startId\` + \`endId\` + a comprehensive technical summary.`,
    `- Target: oldest closed topics, large tool outputs, dead-end exploration. Never compress active work.`,
  ].join("\n")
}

export function makeNudgeId(tokens: number, maxContextLimit: number, mode: string, iterationCount: number): string {
  const bucketSize = Math.max(1, Math.floor(maxContextLimit / 4) || 1)
  const bucket = Math.floor(tokens / bucketSize)
  return `ohc-nudge:${mode}:${bucket}:${iterationCount}`
}

export function buildSystemPromptExtension(config: PluginConfig, modelContextLimit: number): string {
  const limit = modelContextLimit || (typeof config.compress.maxContextLimit === "number" ? config.compress.maxContextLimit : 100000)
  return [
    `## OpenHermes Context Pruning (ohc-pruner, built-in OpenHermes dynamic context pruning)`,
    `- Mode: ${config.compress.nudgeForce || "soft"}. Window: ${Number(limit).toLocaleString()} tokens. Soft limits: ${resolveLimit(config.compress.minContextLimit, limit, 50000).toLocaleString()} / ${resolveLimit(config.compress.maxContextLimit, limit, 100000).toLocaleString()}.`,
    `- When context-pressure messages appear, call the \`compress\` tool immediately.`,
    `- Use range mode: \`startId\` + \`endId\` + a comprehensive technical summary.`,
    `- Target: oldest closed topics, large tool outputs, dead-end exploration. Never compress active work.`,
  ].join("\n")
}

export function totalTokens(messages: unknown[]): number {
  let total = 0
  for (const msg of messages || []) {
    if (!Array.isArray((msg as Record<string, unknown>).parts)) continue
    for (const part of (msg as Record<string, unknown>).parts as Array<Record<string, unknown>>) {
      if (part?.type === "text") total += Math.ceil(((part.text as string) || "").length / 4)
      else if (part?.type === "tool") total += 50
    }
  }
  return total
}

export function filterShape(messages: unknown[]): unknown[] {
  if (!Array.isArray(messages)) return []
  return messages.filter(m => m && ((m as Record<string, unknown>).info || (m as Record<string, unknown>).id || (m as Record<string, unknown>).messageId) && Array.isArray((m as Record<string, unknown>).parts))
}
