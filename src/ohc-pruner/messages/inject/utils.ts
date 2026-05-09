import type { SessionState } from "../../state.js"
import type { PluginConfig } from "../../config.js"
import type { CompressionPriorityMap, MessagePriority } from "../priority.js"
import {
  appendToTextPart,
  appendToLastTextPart,
  createSyntheticTextPart,
  hasContent,
} from "../utils.js"
import { getLastUserMessage, isIgnoredUserMessage } from "../query.js"
import { getMessageId, getRole } from "../index.js"

export interface LastUserModelContext {
  providerId: string | undefined
  modelId: string | undefined
}

export interface LastNonIgnoredMessage {
  message: Record<string, unknown>
  index: number
}

export function getNudgeFrequency(config: PluginConfig): number {
  return Math.max(1, Math.floor(config.compress.nudgeFrequency || 1))
}

export function getIterationNudgeThreshold(config: PluginConfig): number {
  return Math.max(1, Math.floor(config.compress.iterationNudgeThreshold || 1))
}

export function findLastNonIgnoredMessage(messages: unknown[]): LastNonIgnoredMessage | null {
  for (let i = messages.length - 1; i >= 0; i--) {
    const message = messages[i] as Record<string, unknown>
    if (isIgnoredUserMessage(message)) continue
    return { message, index: i }
  }
  return null
}

export function countMessagesAfterIndex(messages: unknown[], index: number): number {
  let count = 0
  for (let i = index + 1; i < messages.length; i++) {
    const message = messages[i] as Record<string, unknown>
    if (isIgnoredUserMessage(message)) continue
    count++
  }
  return count
}

export function getModelInfo(messages: unknown[]): LastUserModelContext {
  const lastUserMessage = getLastUserMessage(messages)
  if (!lastUserMessage) {
    return { providerId: undefined, modelId: undefined }
  }
  const userInfo = lastUserMessage.info as Record<string, unknown> | undefined
  return {
    providerId: (userInfo?.model as Record<string, unknown>)?.providerID as string | undefined,
    modelId: (userInfo?.model as Record<string, unknown>)?.modelID as string | undefined,
  }
}

function resolveContextTokenLimit(
  config: PluginConfig,
  state: SessionState,
  providerId: string | undefined,
  modelId: string | undefined,
  threshold: "max" | "min",
): number | undefined {
  const parseLimitValue = (limit: number | `${number}%` | undefined): number | undefined => {
    if (limit === undefined) return undefined
    if (typeof limit === "number") return limit
    if (!limit.endsWith("%") || state.modelContextLimit === null) return undefined
    const parsedPercent = parseFloat(limit.slice(0, -1))
    if (isNaN(parsedPercent)) return undefined
    const clampedPercent = Math.max(0, Math.min(100, Math.round(parsedPercent)))
    return Math.round((clampedPercent / 100) * state.modelContextLimit)
  }

  const modelLimits =
    threshold === "max" ? config.compress.modelMaxLimits : config.compress.modelMinLimits
  if (modelLimits && providerId !== undefined && modelId !== undefined) {
    const providerModelId = `${providerId}/${modelId}`
    const modelLimit = modelLimits[providerModelId]
    if (modelLimit !== undefined) return parseLimitValue(modelLimit)
  }

  const globalLimit =
    threshold === "max" ? config.compress.maxContextLimit : config.compress.minContextLimit
  return parseLimitValue(globalLimit)
}

export function isContextOverLimits(
  config: PluginConfig,
  state: SessionState,
  providerId: string | undefined,
  modelId: string | undefined,
  messages: unknown[],
): { overMaxLimit: boolean; overMinLimit: boolean } {
  const maxContextLimit = resolveContextTokenLimit(config, state, providerId, modelId, "max")
  const minContextLimit = resolveContextTokenLimit(config, state, providerId, modelId, "min")

  let currentTokens = 0
  for (const msg of messages) {
    const parts = Array.isArray((msg as any).parts) ? (msg as any).parts : []
    for (const part of parts) {
      if (part.type === "text") currentTokens += Math.ceil(((part.text as string) || "").length / 4)
      else if (part.type === "tool") currentTokens += 50
    }
  }

  const overMaxLimit = maxContextLimit === undefined ? false : currentTokens > maxContextLimit
  const overMinLimit = minContextLimit === undefined ? true : currentTokens >= minContextLimit

  return { overMaxLimit, overMinLimit }
}

export function addAnchor(
  anchorMessageIds: Map<string, number> | Set<string>,
  anchorMessageId: string,
  anchorMessageIndex: number,
  messages: unknown[],
  interval: number,
): boolean {
  if (anchorMessageIndex < 0) return false

  let latestAnchorMessageIndex = -1
  for (let i = messages.length - 1; i >= 0; i--) {
    const id = getMessageId(messages[i] as Record<string, unknown>)
    if (id && anchorMessageIds.has(id)) {
      latestAnchorMessageIndex = i
      break
    }
  }

  const shouldAdd = latestAnchorMessageIndex < 0 || anchorMessageIndex - latestAnchorMessageIndex >= interval
  if (!shouldAdd) return false

  const previousSize = anchorMessageIds.size
  if (anchorMessageIds instanceof Map) {
    anchorMessageIds.set(anchorMessageId, anchorMessageIndex)
  } else {
    anchorMessageIds.add(anchorMessageId)
  }
  return anchorMessageIds.size !== previousSize
}

function injectAnchoredNudge(message: Record<string, unknown>, nudgeText: string): void {
  if (!nudgeText.trim()) return

  const role = getRole(message)
  if (role === "user") {
    if (appendToLastTextPart(message, nudgeText)) return
    const parts = Array.isArray(message.parts) ? (message.parts as any[]) : []
    parts.push(createSyntheticTextPart(message, nudgeText))
    message.parts = parts
    return
  }

  if (role !== "assistant") return
  if (!hasContent(message)) return

  const parts = Array.isArray(message.parts) ? (message.parts as any[]) : []
  for (const part of parts) {
    if (part.type === "text") {
      if (appendToTextPart(part, nudgeText)) return
    }
  }

  const syntheticPart = createSyntheticTextPart(message, nudgeText)
  const firstToolIndex = parts.findIndex((p: any) => p.type === "tool")
  if (firstToolIndex === -1) {
    parts.push(syntheticPart)
  } else {
    parts.splice(firstToolIndex, 0, syntheticPart)
  }
  message.parts = parts
}

function collectAnchoredMessages(
  anchorMessageIds: Map<string, number> | Set<string>,
  messages: unknown[],
): Array<{ message: Record<string, unknown>; index: number }> {
  const anchoredMessages: Array<{ message: Record<string, unknown>; index: number }> = []
  for (const anchorMessageId of anchorMessageIds.keys()) {
    const index = (messages as Array<Record<string, unknown>>).findIndex(
      m => getMessageId(m) === anchorMessageId,
    )
    if (index === -1) continue
    anchoredMessages.push({ message: messages[index] as Record<string, unknown>, index })
  }
  return anchoredMessages
}

function collectTurnNudgeAnchors(
  state: SessionState,
  config: PluginConfig,
  messages: unknown[],
): Map<string, number> {
  const turnNudgeAnchors = new Map<string, number>()
  const targetRole = config.compress.nudgeForce === "strong" ? "user" : "assistant"
  const nudges = state.nudges!

  for (const message of messages) {
    const m = message as Record<string, unknown>
    const mid = getMessageId(m)
    if (!mid || !nudges.turnNudgeAnchors.has(mid)) continue
    if (getRole(m) === targetRole) turnNudgeAnchors.set(mid, 0)
  }

  return turnNudgeAnchors
}

function applyRangeModeAnchoredNudge(
  anchorMessageIds: Map<string, number> | Set<string>,
  messages: unknown[],
  baseNudgeText: string,
): void {
  for (const { message } of collectAnchoredMessages(anchorMessageIds, messages)) {
    injectAnchoredNudge(message, baseNudgeText)
  }
}

function applyMessageModeAnchoredNudge(
  anchorMessageIds: Map<string, number> | Set<string>,
  messages: unknown[],
  baseNudgeText: string,
  compressionPriorities?: CompressionPriorityMap,
): void {
  for (const { message } of collectAnchoredMessages(anchorMessageIds, messages)) {
    injectAnchoredNudge(message, baseNudgeText)
  }
}

export function applyAnchoredNudges(
  state: SessionState,
  config: PluginConfig,
  messages: unknown[],
  compressionPriorities?: CompressionPriorityMap,
  nudges?: {
    contextLimitNudge: string
    turnNudge: string
    iterationNudge: string
  },
): void {
  const turnNudgeAnchors = collectTurnNudgeAnchors(state, config, messages)
  const nudgeState = state.nudges!
  const ctxNudge = nudges?.contextLimitNudge ?? ""
  const turnNudgeText = nudges?.turnNudge ?? ""
  const iterNudgeText = nudges?.iterationNudge ?? ""

  if (config.compress.mode === "message") {
    applyMessageModeAnchoredNudge(nudgeState.contextLimitAnchors, messages, ctxNudge, compressionPriorities)
    applyMessageModeAnchoredNudge(turnNudgeAnchors, messages, turnNudgeText, compressionPriorities)
    applyMessageModeAnchoredNudge(nudgeState.iterationNudgeAnchors, messages, iterNudgeText, compressionPriorities)
    return
  }

  applyRangeModeAnchoredNudge(nudgeState.contextLimitAnchors, messages, ctxNudge)
  applyRangeModeAnchoredNudge(turnNudgeAnchors, messages, turnNudgeText)
  applyRangeModeAnchoredNudge(nudgeState.iterationNudgeAnchors, messages, iterNudgeText)
}
