import type { SessionState } from "../state.js"
import type { Logger } from "../logger.js"
import type { PluginConfig } from "../config.js"
import { assignMessageRefs } from "../messages/index.js"
import { isIgnoredUserMessage } from "../messages/query.js"
import { buildSearchContext } from "./search.js"
import type { SearchContext } from "./search.js"
import { applyPendingCompressionDurations } from "./timing.js"

export interface NotificationEntry {
  blockId: string
  runId: number
  summary: string
  summaryTokens: number
}

export interface PreparedSession {
  rawMessages: unknown[]
  searchContext: SearchContext
}

export async function prepareSession(
  state: SessionState,
  logger: Logger,
  config: PluginConfig,
  toolCtx: { sessionID: string },
  topic: string,
): Promise<PreparedSession> {
  if (state.manualMode && state.manualMode !== "compress-pending") {
    throw new Error(
      "Manual mode: compress blocked. Do not retry until `<compress triggered manually>` appears in user context.",
    )
  }

  const rawMessages: unknown[] = []

  assignMessageRefs(state, rawMessages)

  return {
    rawMessages,
    searchContext: buildSearchContext(state, rawMessages),
  }
}

export async function finalizeSession(
  state: SessionState,
  logger: Logger,
  config: PluginConfig,
  rawMessages: unknown[],
  notifications: NotificationEntry[],
  topic: string | undefined,
): Promise<void> {
  state.manualMode = state.manualMode ? ("active" as const) : false
  applyPendingCompressionDurations(state)

  logger.info("Session finalized", {
    topic,
    notificationCount: notifications.length,
  })
}
