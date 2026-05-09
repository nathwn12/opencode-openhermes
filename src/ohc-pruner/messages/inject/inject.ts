import type { SessionState } from "../../state.js"
import type { Logger } from "../../logger.js"
import type { PluginConfig } from "../../config.js"
import type { CompressionPriorityMap } from "../priority.js"
import type { PromptCollection } from "../../prompts/store.js"
import { compressPermission } from "../../compress-permission.js"
import {
  getLastUserMessage,
  isIgnoredUserMessage,
  isProtectedUserMessage,
  messageHasCompress,
} from "../query.js"
import {
  appendToTextPart,
  appendToLastTextPart,
  appendToAllToolParts,
  createSyntheticTextPart,
  hasContent,
} from "../utils.js"
import { getMessageId, getRole } from "../index.js"
import {
  addAnchor,
  applyAnchoredNudges,
  countMessagesAfterIndex,
  findLastNonIgnoredMessage,
  getIterationNudgeThreshold,
  getNudgeFrequency,
  getModelInfo,
  isContextOverLimits,
} from "./utils.js"

const MESSAGE_ID_TAG_NAME = "ohc-message-id"

function formatOhcMessageIdTag(
  ref: string,
  attributes?: Record<string, string | undefined>,
): string {
  const serializedAttributes = Object.entries(attributes || {})
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([name, value]) => {
      if (name.trim().length === 0 || typeof value !== "string" || value.length === 0) return ""
      return ` ${name}="${value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}"`
    })
    .join("")

  return `\n<${MESSAGE_ID_TAG_NAME}${serializedAttributes}>${ref}</${MESSAGE_ID_TAG_NAME}>`
}

export function injectCompressNudges(
  state: SessionState,
  config: PluginConfig,
  logger: Logger,
  messages: unknown[],
  compressionPriorities?: CompressionPriorityMap,
  prompts?: Pick<PromptCollection, "context-limit-nudge" | "turn-nudge" | "iteration-nudge">,
): void {
  if (compressPermission(state, config) === "deny") return
  if (state.manualMode) return

  const nudges = state.nudges!
  const lastMessage = findLastNonIgnoredMessage(messages)
  let lastAssistantMessage: Record<string, unknown> | undefined
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i] as Record<string, unknown>
    if (getRole(m) === "assistant") { lastAssistantMessage = m; break }
  }

  if (lastAssistantMessage && messageHasCompress(lastAssistantMessage)) {
    nudges.contextLimitAnchors.clear()
    nudges.turnNudgeAnchors.clear()
    nudges.iterationNudgeAnchors.clear()
    return
  }

  const { providerId, modelId } = getModelInfo(messages)
  let anchorsChanged = false

  const { overMaxLimit, overMinLimit } = isContextOverLimits(
    config, state, providerId, modelId, messages,
  )

  if (!overMinLimit) {
    const hadTurnAnchors = nudges.turnNudgeAnchors.size > 0
    const hadIterationAnchors = nudges.iterationNudgeAnchors.size > 0
    if (hadTurnAnchors || hadIterationAnchors) {
      nudges.turnNudgeAnchors.clear()
      nudges.iterationNudgeAnchors.clear()
      anchorsChanged = true
    }
  }

  if (overMaxLimit) {
    if (lastMessage) {
      const interval = getNudgeFrequency(config)
      const added = addAnchor(
        nudges.contextLimitAnchors,
        getMessageId(lastMessage.message),
        lastMessage.index,
        messages,
        interval,
      )
      if (added) anchorsChanged = true
    }
  } else if (overMinLimit) {
    const isLastMessageUser = lastMessage?.message && getRole(lastMessage.message) === "user"

    if (isLastMessageUser && lastAssistantMessage) {
      const previousSize = nudges.turnNudgeAnchors.size
      nudges.turnNudgeAnchors.set(getMessageId(lastMessage!.message), 0)
      nudges.turnNudgeAnchors.set(getMessageId(lastAssistantMessage), 0)
      if (nudges.turnNudgeAnchors.size !== previousSize) anchorsChanged = true
    }

    const lastUserMessage = getLastUserMessage(messages)
    if (lastUserMessage && lastMessage) {
      const lastUserMessageIndex = (messages as Array<Record<string, unknown>>).findIndex(
        m => getMessageId(m) === getMessageId(lastUserMessage),
      )
      if (lastUserMessageIndex >= 0) {
        const messagesSinceUser = countMessagesAfterIndex(messages, lastUserMessageIndex)
        const iterationThreshold = getIterationNudgeThreshold(config)

        if (lastMessage.index > lastUserMessageIndex && messagesSinceUser >= iterationThreshold) {
          const interval = getNudgeFrequency(config)
          const added = addAnchor(
            nudges.iterationNudgeAnchors,
            getMessageId(lastMessage.message),
            lastMessage.index,
            messages,
            interval,
          )
          if (added) anchorsChanged = true
        }
      }
    }
  }

  const nudgeTexts = prompts ? {
    contextLimitNudge: prompts["context-limit-nudge"],
    turnNudge: prompts["turn-nudge"],
    iterationNudge: prompts["iteration-nudge"],
  } : undefined
  applyAnchoredNudges(state, config, messages, compressionPriorities, nudgeTexts)

  if (anchorsChanged) {
    logger.info("Nudge anchors changed", {
      contextLimitAnchors: nudges.contextLimitAnchors.size,
      turnNudgeAnchors: nudges.turnNudgeAnchors.size,
      iterationNudgeAnchors: nudges.iterationNudgeAnchors.size,
    })
  }
}

export function injectMessageIds(
  state: SessionState,
  config: PluginConfig,
  messages: unknown[],
  compressionPriorities?: CompressionPriorityMap,
): void {
  if (compressPermission(state, config) === "deny") return

  for (const message of messages) {
    const m = message as Record<string, unknown>
    if (isIgnoredUserMessage(m)) continue

    const messageRef = state.messageIds.get(getMessageId(m)) as string | undefined
    if (!messageRef) continue

    const isBlockedMessage = isProtectedUserMessage(config, m)
    const priority = config.compress.mode === "message" && !isBlockedMessage
      ? compressionPriorities?.get((m.info as Record<string, unknown>)?.id as string)?.priority
      : undefined
    const tag = formatOhcMessageIdTag(
      isBlockedMessage ? "BLOCKED" : messageRef,
      priority ? { priority } : undefined,
    )

    if (getRole(m) === "user") {
      let injected = false
      const parts = Array.isArray(m.parts) ? (m.parts as any[]) : []
      for (const part of parts) {
        if (part.type === "text") injected = appendToTextPart(part, tag) || injected
      }
      if (injected) continue
      parts.push(createSyntheticTextPart(m, tag))
      m.parts = parts
      continue
    }

    if (getRole(m) !== "assistant") continue
    if (!hasContent(m)) continue
    if (appendToAllToolParts(m, tag)) continue
    if (appendToLastTextPart(m, tag)) continue

    const syntheticPart = createSyntheticTextPart(m, tag)
    const parts = Array.isArray(m.parts) ? (m.parts as any[]) : []
    const firstToolIndex = parts.findIndex((p: any) => p.type === "tool")
    if (firstToolIndex === -1) {
      parts.push(syntheticPart)
    } else {
      parts.splice(firstToolIndex, 0, syntheticPart)
    }
    m.parts = parts
  }
}
