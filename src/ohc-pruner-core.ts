import { tool } from "@opencode-ai/plugin"
import { loadConfig, resolveLimit } from "./ohc-pruner/config.js"
import type { PluginConfig, Permission } from "./ohc-pruner/config.js"
import { createSessionState, loadState, saveState, syncBlockToState } from "./ohc-pruner/state.js"
import type { SessionState, CompressionBlock } from "./ohc-pruner/state.js"
import { createCompressRangeTool } from "./ohc-pruner/compress/range.js"
import { createCompressMessageTool } from "./ohc-pruner/compress/message.js"
import { buildPriorityMap, listPriorityRefsBeforeIndex } from "./ohc-pruner/messages/priority.js"
import { isContextOverLimits, getNudgeFrequency, getIterationNudgeThreshold, addAnchor } from "./ohc-pruner/messages/inject/utils.js"
import { injectCompressNudges, injectMessageIds } from "./ohc-pruner/messages/inject/inject.js"
import { prune } from "./ohc-pruner/messages/prune.js"
import { syncCompressionBlocks } from "./ohc-pruner/messages/sync.js"
import { stripHallucinationsFromString, stripHallucinations, buildToolIdList } from "./ohc-pruner/messages/utils.js"
import { filterMessagesInPlace } from "./ohc-pruner/messages/shape.js"
import { stripStaleMetadata } from "./ohc-pruner/messages/reasoning-strip.js"
import { checkSession } from "./ohc-pruner/state/index.js"
import {
  assignMessageRefs, buildSystemPromptExtension,
  totalTokens, isUserTurn, sinceLastUser, getMessageId, getRole,
} from "./ohc-pruner/messages/index.js"
import {
  applyPendingManualTrigger, handleHelpCommand, handleContextCommand, handleStatsCommand,
  handleSweepCommand, handleManualToggleCommand, handleManualTriggerCommand,
  handleDecompressCommand, handleRecompressCommand,
} from "./ohc-pruner/commands/index.js"
import { Logger } from "./ohc-pruner/logger.js"
import { startAutoUpdate } from "./ohc-pruner/update.js"
import { configureClientAuth } from "./ohc-pruner/auth.js"
import { PromptStore } from "./ohc-pruner/prompts/store.js"
import { renderSystemPrompt } from "./ohc-pruner/prompts/index.js"
import { compressPermission, syncCompressPermissionState } from "./ohc-pruner/compress-permission.js"
import type { HostPermissionSnapshot } from "./ohc-pruner/host-permissions.js"
import { consumeCompressionStart, applyPendingCompressionDurations } from "./ohc-pruner/compress/timing.js"

const NAME = "ohc-pruner"

interface PluginClient {
  tui?: { showToast?: (opts: unknown) => Promise<unknown> }
  session?: { messages?: (opts: unknown) => Promise<unknown> }
}

export async function OHCPrunerPlugin({ client, directory }: { client: PluginClient; directory?: string }): Promise<Record<string, unknown>> {
  const cwd = directory || process.cwd()

  const config = loadConfig(cwd, client as any)
  if (!config.enabled) return {}

  const state = createSessionState()
  const logger = new Logger(config.debug)

  const persisted = loadState(cwd)
  const persistedBlocks = Array.isArray(persisted.blocks) ? persisted.blocks as Record<string, unknown>[] : []
  const persistedDecompressedBlocks = Array.isArray(persisted.decompressedBlocks) ? persisted.decompressedBlocks as Record<string, unknown>[] : []
  if (persistedBlocks.length > 0 || persistedDecompressedBlocks.length > 0) {
    const now = Date.now()
    let maxBlockId = state.blockIdCounter
    let maxRunId = state.compressionRunCounter

    const hydrateBlock = (b: Record<string, unknown>): CompressionBlock | null => {
      const id = b.id as string
      if (!id) return null
      const rawRunId = b.runId
      const runId = typeof rawRunId === "number" && Number.isFinite(rawRunId)
        ? rawRunId
        : typeof rawRunId === "string"
          ? Number.parseInt(rawRunId.replace(/^run-/, ""), 10)
          : 0
      return {
        id,
        runId: Number.isInteger(runId) && runId > 0 ? runId : 0,
        topic: (b.topic as string) || "",
        batchTopic: (b.batchTopic as string) || (b.topic as string) || "",
        startId: (b.startId as string) || "",
        endId: (b.endId as string) || "",
        mode: (b.mode as string) || "range",
        summary: (b.summary as string) || "",
        summaryTokens: (b.summaryTokens as number) || 0,
        compressMessageId: (b.compressMessageId as string) || (b.summaryMessageId as string) || null,
        compressCallId: (b.compressCallId as string) || null,
        anchorMessageId: (b.anchorMessageId as string) || "",
        messageIds: Array.isArray(b.messageIds) ? b.messageIds as string[] : [],
        consumedBlockIds: Array.isArray(b.consumedBlockIds) ? b.consumedBlockIds as string[] : [],
        createdAt: typeof b.createdAt === "string" ? new Date(b.createdAt).getTime() : now,
        appliedAt: b.appliedAt ? (typeof b.appliedAt === "string" ? new Date(b.appliedAt).getTime() : (b.appliedAt as number)) : null,
        deactivatedAt: b.deactivatedAt ? (typeof b.deactivatedAt === "string" ? new Date(b.deactivatedAt).getTime() : (b.deactivatedAt as number)) : null,
      }
    }

    const trackCounters = (block: CompressionBlock): void => {
      const blockNum = parseInt(block.id.slice(1), 10)
      if (Number.isInteger(blockNum) && blockNum > maxBlockId) maxBlockId = blockNum
      const runNum = block.runId
      if (Number.isInteger(runNum) && runNum > maxRunId) maxRunId = runNum
    }

    for (const b of persistedBlocks) {
      const block = hydrateBlock(b)
      if (!block) continue
      state.blocks.push(block)
      trackCounters(block)
    }

    for (const b of persistedDecompressedBlocks) {
      const block = hydrateBlock(b)
      if (!block) continue
      state.decompressedBlocks.push(block)
      trackCounters(block)
    }

    state.blockIdCounter = maxBlockId
    state.compressionRunCounter = maxRunId
    if (persisted.stats && typeof persisted.stats === "object") {
      const ps = persisted.stats as Record<string, unknown>
      if (typeof ps.totalCompressed === "number") state.stats.totalCompressed = ps.totalCompressed as number
      if (typeof ps.totalSavedTokens === "number") state.stats.totalSavedTokens = ps.totalSavedTokens as number
      if (typeof ps.compressionCount === "number") state.stats.compressionCount = ps.compressionCount as number
      if (typeof ps.dedupCount === "number") state.stats.dedupCount = ps.dedupCount as number
      if (typeof ps.purgeCount === "number") state.stats.purgeCount = ps.purgeCount as number
    }
    logger.info(`Restored ${state.blocks.length} active and ${state.decompressedBlocks.length} decompressed compression blocks from state`)
  }
  const promptStore = new PromptStore(
    process.env.OPENCODE_CONFIG_DIR ? undefined : undefined,
    undefined,
  )

  configureClientAuth(client as any)

  const toolPermission: Permission = config.compress.permission || "allow"
  const compressToolContext = { client, state, config, cwd }

  startAutoUpdate(client, config.autoUpdate)

  if (config.experimental.customPrompts) {
    promptStore.ensureDefaultFiles()
    promptStore.reload()
  }

  return {
    config: async (opencodeConfig: any) => {
      if (toolPermission !== "deny") {
        opencodeConfig.experimental = opencodeConfig.experimental || {}
        const existingPrimaryTools = Array.isArray(opencodeConfig.experimental.primary_tools)
          ? opencodeConfig.experimental.primary_tools
          : []
        if (!existingPrimaryTools.includes("compress")) {
          opencodeConfig.experimental.primary_tools = [...existingPrimaryTools, "compress"]
        }
        opencodeConfig.permission = opencodeConfig.permission || {}
        if (opencodeConfig.permission.compress === undefined) {
          opencodeConfig.permission.compress = toolPermission
        }
      }
      if (config.commands.enabled && toolPermission !== "deny") {
        opencodeConfig.command = opencodeConfig.command || {}
        opencodeConfig.command.ohc = {
          template: "[context|stats|sweep|manual|compress|decompress|recompress]",
          description: "OpenHermes OHC commands - manage context pruning",
        }
      }
    },

    "experimental.chat.system.transform": async (input: Record<string, unknown>, output: Record<string, unknown>) => {
      if (input.model && (input.model as Record<string, unknown>).limit) {
        const modelLimit = ((input.model as Record<string, unknown>).limit as Record<string, unknown>).context as number | undefined
        if (modelLimit) {
          state.modelContextLimit = modelLimit
        }
      }
      if (toolPermission === "deny" || !config.enabled) return

      const systemParts = Array.isArray(output.system) ? output.system : []
      const systemText = systemParts.join("\n")
      if (systemText.includes("You are a title generator") ||
          systemText.includes("summarizing conversations") ||
          systemText.includes("subagent")) {
        state.isSubAgent = true
        if (!config.experimental.allowSubAgents) return
      }

      const limit = state.modelContextLimit || (typeof config.compress.maxContextLimit === "number" ? config.compress.maxContextLimit : 100000)
      output.system = output.system || []

      if (config.experimental.customPrompts && promptStore) {
        const prompts = promptStore.getRuntimePrompts()
        const rendered = renderSystemPrompt({
          protectedTools: config.compress.protectedTools,
          manualMode: config.manualMode.enabled,
          isSubAgent: state.isSubAgent,
          customPromptsEnabled: true,
          promptStore,
        })
        if (Array.isArray(output.system) && output.system.length > 0) {
          (output.system as string[])[(output.system as string[]).length - 1] += `\n\n${rendered}`
        } else {
          (output.system as string[]).push(rendered)
        }
      } else {
        const extension = buildSystemPromptExtension(config, limit)
        if (Array.isArray(output.system) && output.system.length > 0) {
          (output.system as string[])[(output.system as string[]).length - 1] += `\n\n${extension}`
        } else {
          (output.system as string[]).push(extension)
        }
      }
    },

    "experimental.chat.messages.transform": async (_input: Record<string, unknown>, output: Record<string, unknown>) => {
      if (toolPermission === "deny" || !config.enabled) return
      const receivedCount = Array.isArray(output.messages) ? output.messages.length : 0
      const messages = filterMessagesInPlace(output.messages)
      if (messages.length === 0) return
      if (messages.length !== receivedCount) {
        logger.warn("Filtered malformed messages", { received: receivedCount, usable: messages.length })
      }

      checkSession(state, logger, messages)

      stripHallucinations(messages)
      assignMessageRefs(state, messages)
      syncCompressionBlocks(state, logger, messages)
      buildToolIdList(state, messages)
      prune(state, logger, config, messages)

      if (state.isSubAgent && !config.experimental.allowSubAgents) {
        output.messages = messages
        return
      }

      const priorityMap = buildPriorityMap(config, state, messages)
      const runtimePrompts = config.experimental.customPrompts ? promptStore.getRuntimePrompts() : undefined
      injectCompressNudges(state, config, logger, messages, priorityMap, runtimePrompts)
      injectMessageIds(state, config, messages, priorityMap)
      applyPendingManualTrigger(state, messages)
      stripStaleMetadata(messages)

      output.messages = messages
    },

    "experimental.text.complete": async (_input: Record<string, unknown>, output: Record<string, unknown>) => {
      if (toolPermission === "deny" || !config.enabled) return
      const text = output.text as string | undefined
      if (text && typeof text === "string") {
        output.text = stripHallucinationsFromString(text)
      }
    },

    "experimental.session.compacting": async (_input: Record<string, unknown>, output: Record<string, unknown>) => {
      if (toolPermission === "deny" || !config.enabled || !state.prune) return
      const activeBlocks = state.blocks.filter(b => !b.deactivatedAt)
      if (activeBlocks.length === 0) return
      const blocksSummary = activeBlocks.map(b =>
        `- Block ${b.id} ("${b.topic}"): ${b.startId} → ${b.endId} (${b.summaryTokens} tok)`
      ).join("\n")
      const contextList = Array.isArray(output.context) ? (output.context as string[]) : []
      if (!Array.isArray(output.context)) output.context = contextList
      const context = [
        `## OpenHermes OHC Pruner State`,
        `Active compression blocks (preserved for restoration):`,
        blocksSummary,
      ].join("\n")
      contextList.push(context)
    },

    "command.execute.before": async (input: Record<string, unknown>, _output: Record<string, unknown>) => {
      if (!config.commands.enabled || toolPermission === "deny") return
      if (input.command !== "ohc") return

      const messagesResponse = await (client.session as any).messages({ path: { id: input.sessionID } })
      const sessionMessages = Array.isArray(messagesResponse?.data) ? messagesResponse.data
        : Array.isArray(messagesResponse) ? messagesResponse : []

      const args = ((input.arguments as string) || "").trim().split(/\s+/).filter(Boolean)
      const subcommand = args[0]?.toLowerCase() || ""
      const subArgs = args.slice(1)

      const ctx = { client, state, config, sessionId: input.sessionID as string, messages: sessionMessages, cwd }

      try {
        if (subcommand === "context") { await handleContextCommand(ctx as any); throw new Error("__OHC_CONTEXT_HANDLED__") }
        if (subcommand === "stats") { await handleStatsCommand(ctx as any); throw new Error("__OHC_STATS_HANDLED__") }
        if (subcommand === "sweep") { await handleSweepCommand({ ...ctx, args: subArgs } as any); throw new Error("__OHC_SWEEP_HANDLED__") }
        if (subcommand === "manual") { await handleManualToggleCommand(ctx as any, subArgs[0]?.toLowerCase()); throw new Error("__OHC_MANUAL_HANDLED__") }
        if (subcommand === "compress") {
          const userFocus = subArgs.join(" ").trim()
          const prompt = await handleManualTriggerCommand(ctx as any, "compress", userFocus)
          if (!prompt) throw new Error("__OHC_MANUAL_TRIGGER_BLOCKED__")
          state.manualMode = "compress-pending"
          state.pendingManualTrigger = { sessionId: input.sessionID as string, prompt }
          _output.parts = []
          _output.parts = [{ type: "text", text: `/ohc ${subcommand}` } as any]
          return
        }
        if (subcommand === "decompress") { await handleDecompressCommand({ ...ctx, args: subArgs } as any); throw new Error("__OHC_DECOMPRESS_HANDLED__") }
        if (subcommand === "recompress") { await handleRecompressCommand({ ...ctx, args: subArgs } as any); throw new Error("__OHC_RECOMPRESS_HANDLED__") }
        await handleHelpCommand(ctx as any); throw new Error("__OHC_HELP_HANDLED__")
      } catch (err) {
        if ((err as Error).message?.startsWith("__OHC_")) return
        throw err
      }
    },

    event: async (eventData: Record<string, unknown>) => {
      if (eventData.type !== "message.part.updated") return
      const evProps = eventData.properties as Record<string, unknown> | undefined
      if (!evProps?.part || typeof evProps.part !== "object") return
      const p = evProps.part as Record<string, unknown>
      const toolName = (p as any).tool || ""
      if (p.type !== "tool" || toolName !== "compress") return
      const ps = (p.state || {}) as Record<string, unknown>

      if (ps.status === "pending") {
        if (typeof p.callID === "string" && typeof p.messageID === "string") {
          const k = `${p.messageID}::${p.callID}`
          if (!state.compressionTiming.startsByCallId.has(k)) {
            state.compressionTiming.startsByCallId.set(k, Date.now())
          }
        }
        return
      }

      if (ps.status === "completed") {
        if (typeof p.callID === "string" && typeof p.messageID === "string") {
          const k = `${p.messageID}::${p.callID}`
          const startedAt = consumeCompressionStart(state, p.messageID as string, p.callID as string)
          const durationMs = startedAt ? Date.now() - startedAt : 0
          if (durationMs > 0) {
            state.compressionTiming.durationsByBlockId.set(k, durationMs)
            state.stats.totalSavedTokens = (state.stats.totalSavedTokens || 0) + Math.round(durationMs / 10)
            logger.info("Compression completed", { callId: p.callID, durationMs })
          }
          applyPendingCompressionDurations(state)
        }
        return
      }

      if (typeof p.callID === "string" && typeof p.messageID === "string") {
        state.compressionTiming.startsByCallId.delete(`${p.messageID}::${p.callID}`)
      }
    },

    tool: toolPermission === "deny" ? {} : {
      compress: config.compress.mode === "message"
        ? createCompressMessageTool(compressToolContext as any)
        : createCompressRangeTool(compressToolContext as any),
    },
  }
}

export default { id: NAME, server: OHCPrunerPlugin }
