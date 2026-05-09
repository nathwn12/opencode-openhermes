import type { SessionState, PruneEntry } from "../state.js"
import type { Logger } from "../logger.js"
import type { PluginConfig } from "../config.js"
import { getMessageId, getRole } from "./index.js"
import { createSyntheticUserMessage } from "./utils.js"
import { getLastUserMessage } from "./query.js"

const PRUNED_TOOL_OUTPUT_REPLACEMENT = "[Output removed to save context - information superseded or no longer needed]"
const PRUNED_TOOL_ERROR_INPUT_REPLACEMENT = "[input removed due to failed tool call]"
const PRUNED_QUESTION_INPUT_REPLACEMENT = "[questions removed - see output for user's answers]"

function isMessageCompacted(state: SessionState, message: Record<string, unknown>): boolean {
  const msgId = getMessageId(message)
  if (!msgId) return false
  const pruneMessages = state.prune?.messages
  if (pruneMessages) {
    const entry = pruneMessages.byMessageId.get(msgId) as PruneEntry | undefined
    if (entry && entry.activeBlockIds.length > 0) return true
  }
  return state.blocks.some(b => b.messageIds?.includes(msgId))
}

export function prune(
  state: SessionState,
  logger: Logger,
  config: PluginConfig,
  messages: unknown[],
): void {
  filterCompressedRanges(state, logger, config, messages)
  pruneToolOutputs(state, logger, messages)
  pruneToolInputs(state, logger, messages)
  pruneToolErrors(state, logger, messages)
}

function filterCompressedRanges(
  state: SessionState,
  logger: Logger,
  config: PluginConfig,
  messages: unknown[],
): void {
  const pruneMessages = state.prune?.messages
  if (!pruneMessages || pruneMessages.byMessageId.size === 0) return

  const result: unknown[] = []

  for (const msg of messages) {
    const m = msg as Record<string, unknown>
    const msgId = getMessageId(m)

    if (!msgId) {
      result.push(msg)
      continue
    }

    const pruneEntry = pruneMessages.byMessageId.get(msgId) as PruneEntry | undefined
    if (pruneEntry && pruneEntry.activeBlockIds.length > 0) continue

    result.push(msg)
  }

  messages.length = 0
  messages.push(...result)
}

function pruneToolOutputs(
  state: SessionState,
  logger: Logger,
  messages: unknown[],
): void {
  const tools = state.prune?.tools
  if (!tools || tools.size === 0) return

  for (const msg of messages) {
    const m = msg as Record<string, unknown>
    const parts = Array.isArray(m.parts) ? (m.parts as any[]) : []
    for (const part of parts) {
      if (part.type !== "tool") continue
      if (!tools.has(part.callID as string)) continue
      if (part.state?.status !== "completed") continue
      if (part.tool === "question" || part.tool === "edit" || part.tool === "write") continue

      part.state.output = PRUNED_TOOL_OUTPUT_REPLACEMENT
    }
  }
}

function pruneToolInputs(
  state: SessionState,
  logger: Logger,
  messages: unknown[],
): void {
  const tools = state.prune?.tools
  if (!tools || tools.size === 0) return

  for (const msg of messages) {
    const m = msg as Record<string, unknown>
    const parts = Array.isArray(m.parts) ? (m.parts as any[]) : []
    for (const part of parts) {
      if (part.type !== "tool") continue
      if (!tools.has(part.callID as string)) continue
      if (part.state?.status !== "completed") continue
      if (part.tool !== "question") continue
      if (part.state.input?.questions !== undefined) {
        part.state.input.questions = PRUNED_QUESTION_INPUT_REPLACEMENT
      }
    }
  }
}

function pruneToolErrors(
  state: SessionState,
  logger: Logger,
  messages: unknown[],
): void {
  const tools = state.prune?.tools
  if (!tools || tools.size === 0) return

  for (const msg of messages) {
    const m = msg as Record<string, unknown>
    const parts = Array.isArray(m.parts) ? (m.parts as any[]) : []
    for (const part of parts) {
      if (part.type !== "tool") continue
      if (!tools.has(part.callID as string)) continue
      if (part.state?.status !== "error") continue

      const input = part.state.input
      if (input && typeof input === "object") {
        for (const key of Object.keys(input as Record<string, unknown>)) {
          if (typeof (input as Record<string, unknown>)[key] === "string") {
            (input as Record<string, unknown>)[key] = PRUNED_TOOL_ERROR_INPUT_REPLACEMENT
          }
        }
      }
    }
  }
}
