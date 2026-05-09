import type { PluginConfig } from "../config.js"
import type { SessionState } from "../state.js"
import { isIgnoredUserMessage, isProtectedUserMessage, messageHasCompress } from "./query.js"
import { getMessageId, getRole } from "./index.js"

const MEDIUM_PRIORITY_MIN_TOKENS = 500
const HIGH_PRIORITY_MIN_TOKENS = 5000

export type MessagePriority = "low" | "medium" | "high"

export interface CompressionPriorityEntry {
  ref: string
  tokenCount: number
  priority: MessagePriority
}

export type CompressionPriorityMap = Map<string, CompressionPriorityEntry>

function countAllMessageTokens(msg: Record<string, unknown>): number {
  const parts = Array.isArray(msg.parts) ? msg.parts : []
  let total = 0
  for (const part of parts) {
    if (part.type === "text") {
      total += Math.ceil(((part.text as string) || "").length / 4)
    } else if (part.type === "tool") {
      total += 50
      if (part.state?.output && typeof part.state.output === "string") {
        total += Math.ceil(part.state.output.length / 4)
      }
    }
  }
  return total
}

export function buildPriorityMap(
  config: PluginConfig,
  state: SessionState,
  messages: unknown[],
): CompressionPriorityMap {
  if (config.compress.mode !== "message") return new Map()

  const priorities: CompressionPriorityMap = new Map()

  for (const message of messages) {
    const msg = message as Record<string, unknown>
    if (isIgnoredUserMessage(msg)) continue
    if (isProtectedUserMessage(config, msg)) continue

    const rawMessageId = (msg.info as Record<string, unknown>)?.id as string | undefined
    if (typeof rawMessageId !== "string" || rawMessageId.length === 0) continue

    const ref = getMessageId(msg)
    if (!ref) continue

    const tokenCount = countAllMessageTokens(msg)
    priorities.set(rawMessageId, {
      ref,
      tokenCount,
      priority: messageHasCompress(msg) ? "high" : classifyMessagePriority(tokenCount),
    })
  }

  return priorities
}

export function classifyMessagePriority(tokenCount: number): MessagePriority {
  if (tokenCount >= HIGH_PRIORITY_MIN_TOKENS) return "high"
  if (tokenCount >= MEDIUM_PRIORITY_MIN_TOKENS) return "medium"
  return "low"
}

export function listPriorityRefsBeforeIndex(
  messages: unknown[],
  priorities: CompressionPriorityMap,
  anchorIndex: number,
  priority: MessagePriority,
): string[] {
  const refs: string[] = []
  const seen = new Set<string>()
  const upperBound = Math.max(0, Math.min(anchorIndex, messages.length))

  for (let index = 0; index < upperBound; index++) {
    const msg = messages[index] as Record<string, unknown>
    const rawMessageId = (msg.info as Record<string, unknown>)?.id as string | undefined
    if (typeof rawMessageId !== "string") continue

    const entry = priorities.get(rawMessageId)
    if (!entry || entry.priority !== priority || seen.has(entry.ref)) continue

    seen.add(entry.ref)
    refs.push(entry.ref)
  }

  return refs
}
