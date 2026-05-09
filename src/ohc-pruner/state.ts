import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs"
import { join } from "node:path"
import { homedir } from "node:os"
import { createHash } from "node:crypto"
import type { Permission } from "./config.js"

export const COMPRESSED_BLOCK_HEADER = "ohc-summary"

export interface CompressionTimingEntry {
  messageId: string | null
  callId: string | null
  durationMs: number
}

export interface CompressionBlock {
  id: string
  runId: number
  topic: string
  batchTopic: string
  startId: string
  endId: string
  mode: string
  summary: string
  summaryTokens: number
  compressMessageId: string | null
  compressCallId: string | null
  anchorMessageId: string
  messageIds: string[]
  consumedBlockIds: string[]
  createdAt: number
  appliedAt: number | null
  deactivatedAt: number | null
  active?: boolean
  deactivatedByUser?: boolean
  deactivatedByBlockId?: string
}

export interface CompressionTimingState {
  startsByCallId: Map<string, number>
  pendingByCallId: Map<string, CompressionTimingEntry>
  durationsByBlockId: Map<string, number>
}

export interface SessionStats {
  totalCompressed: number
  totalSavedTokens: number
  compressionCount: number
  dedupCount: number
  purgeCount: number
}

export interface SessionState {
  sessionId: string | null
  isSubAgent: boolean
  manualMode: boolean | "active" | "compress-pending"
  pendingManualTrigger: { sessionId: string; prompt: string } | null
  modelContextLimit: number | null
  refCounter: number
  compressionRunCounter: number
  lastUserTurnIndex: number
  turnCounter: number
  lastCompaction: number
  blocks: CompressionBlock[]
  blockIdCounter: number
  decompressedBlocks: CompressionBlock[]
  toolCache: Record<string, unknown>
  toolIdList: Array<{ id: string; partIndex: number; toolName: string; status: string }>
  messageIds: Map<string, unknown>
  rawIdToRef: Map<string, string>
  refToRawId: Map<string, string>
  cachedMessages: unknown[] | null
  compressPermission: Permission | undefined
  compressionTiming: CompressionTimingState
  stats: SessionStats
  prune?: {
    messages: {
      byMessageId: Map<string, unknown>
      blocksById: Map<string, CompressionBlock>
      activeBlockIds: Set<string>
    }
    tools: Map<string, number>
  }
  nudges?: {
    contextLimitAnchors: Map<string, number>
    turnNudgeAnchors: Map<string, number>
    iterationNudgeAnchors: Set<string>
  }
}

export function createSessionState(): SessionState {
  return {
    sessionId: null,
    isSubAgent: false,
    manualMode: false,
    pendingManualTrigger: null,
    modelContextLimit: null,
    refCounter: 0,
    compressionRunCounter: 0,
    lastUserTurnIndex: -1,
    turnCounter: 0,
    lastCompaction: 0,
    blocks: [],
    blockIdCounter: 0,
    decompressedBlocks: [],
    toolCache: {},
    toolIdList: [],
    messageIds: new Map(),
    rawIdToRef: new Map(),
    refToRawId: new Map(),
    cachedMessages: null,
    compressPermission: undefined,
    compressionTiming: {
      startsByCallId: new Map(),
      pendingByCallId: new Map(),
      durationsByBlockId: new Map(),
    },
    stats: {
      totalCompressed: 0,
      totalSavedTokens: 0,
      compressionCount: 0,
      dedupCount: 0,
      purgeCount: 0,
    },
    prune: {
      messages: {
        byMessageId: new Map(),
        blocksById: new Map(),
        activeBlockIds: new Set(),
      },
      tools: new Map(),
    },
    nudges: {
      contextLimitAnchors: new Map(),
      turnNudgeAnchors: new Map(),
      iterationNudgeAnchors: new Set(),
    },
  }
}

export function allocateBlockId(state: SessionState): string {
  state.blockIdCounter++
  return `b${state.blockIdCounter}`
}

export function allocateRunId(state: SessionState): number {
  state.compressionRunCounter++
  return state.compressionRunCounter
}

export function allocateMessageRef(state: SessionState): string {
  state.refCounter++
  return `m${String(state.refCounter).padStart(4, "0")}`
}

export function wrapCompressedSummary(blockId: string, summary: string): string {
  return `<${COMPRESSED_BLOCK_HEADER} id="${blockId}">\n${summary}\n</${COMPRESSED_BLOCK_HEADER}>`
}

export interface PruneEntry {
  allBlockIds: string[]
  activeBlockIds: string[]
}

export function applyCompressionState(
  state: SessionState,
  meta: {
    topic: string
    batchTopic?: string
    startId: string
    endId: string
    mode?: string
    runId: number
    compressMessageId?: string | null
    compressCallId?: string | null
    summaryTokens?: number
  },
  selection: { messageIds: string[] },
  anchorMessageId: string,
  blockId: string,
  storedSummary: string,
  consumedBlockIds: string[],
): CompressionBlock {
  const block: CompressionBlock = {
    id: blockId,
    runId: meta.runId,
    topic: meta.topic,
    batchTopic: meta.batchTopic || meta.topic,
    startId: meta.startId,
    endId: meta.endId,
    mode: meta.mode || "range",
    summary: storedSummary,
    summaryTokens: meta.summaryTokens || 0,
    compressMessageId: meta.compressMessageId || null,
    compressCallId: meta.compressCallId || null,
    anchorMessageId,
    messageIds: selection.messageIds || [],
    consumedBlockIds: consumedBlockIds || [],
    createdAt: Date.now(),
    appliedAt: null,
    deactivatedAt: null,
  }
  state.blocks.push(block)
  state.blockIdCounter = Math.max(state.blockIdCounter, parseInt(blockId.slice(1), 10) || 0)

  state.stats.totalCompressed += selection.messageIds?.length || 0
  state.stats.compressionCount++

  if (state.prune) {
    state.prune.messages.blocksById.set(blockId, block)
    state.prune.messages.activeBlockIds.add(blockId)
    for (const msgId of selection.messageIds || []) {
      if (!msgId) continue
      const existing = state.prune.messages.byMessageId.get(msgId) as PruneEntry | undefined
      if (existing) {
        if (!existing.allBlockIds.includes(blockId)) existing.allBlockIds.push(blockId)
        if (!existing.activeBlockIds.includes(blockId)) existing.activeBlockIds.push(blockId)
      } else {
        state.prune.messages.byMessageId.set(msgId, {
          allBlockIds: [blockId],
          activeBlockIds: [blockId],
        })
      }
    }
  }

  return block
}

export function findBlockByMessageId(state: SessionState, messageId: string): CompressionBlock | undefined {
  return state.blocks.find(b => b.messageIds?.includes(messageId) || b.id === messageId || b.compressMessageId === messageId)
}

export function findBlockById(state: SessionState, blockId: string): CompressionBlock | undefined {
  return state.blocks.find(b => b.id === blockId)
}

export function decompressBlock(state: SessionState, blockId: string): CompressionBlock | null {
  const idx = state.blocks.findIndex(b => b.id === blockId)
  if (idx === -1) return null
  const block = state.blocks[idx]
  block.deactivatedAt = Date.now()
  state.decompressedBlocks.push(block)
  state.blocks.splice(idx, 1)
  return block
}

export function recompressBlock(state: SessionState, blockId: string): CompressionBlock | null {
  const idx = state.decompressedBlocks.findIndex(b => b.id === blockId)
  if (idx === -1) return null
  const block = state.decompressedBlocks[idx]
  block.deactivatedAt = null
  block.appliedAt = Date.now()
  state.blocks.push(block)
  state.decompressedBlocks.splice(idx, 1)
  return block
}

export function findRecompressibleBlocks(state: SessionState): CompressionBlock[] {
  return state.decompressedBlocks.filter(b => !b.deactivatedAt || (Date.now() - b.deactivatedAt) < 86400000)
}

let _globalState: Record<string, unknown> | null = null

function getStatePath(cwd: string): string {
  const base = join(homedir(), ".config", "opencode", "openhermes", "ohc-pruner")
  if (!existsSync(base)) mkdirSync(base, { recursive: true })
  const hash = createHash("sha256").update(cwd || process.cwd() || homedir()).digest("hex").slice(0, 15)
  return join(base, `${hash}.json`)
}

export function loadState(cwd: string): Record<string, unknown> {
  if (_globalState) return _globalState
  const p = getStatePath(cwd)
  try {
    if (existsSync(p)) {
      const data = JSON.parse(readFileSync(p, "utf8"))
      if (!Array.isArray(data.decompressedBlocks)) data.decompressedBlocks = []
      _globalState = data
      return data
    }
  } catch {}
  _globalState = { version: 2, workspace: cwd, updatedAt: new Date().toISOString(), blocks: [], decompressedBlocks: [], stats: { totalCompressed: 0, totalSavedTokens: 0, compressionCount: 0, dedupCount: 0, purgeCount: 0 } }
  return _globalState
}

export function saveState(cwd: string): void {
  if (!_globalState) return
  _globalState.updatedAt = new Date().toISOString()
  const p = getStatePath(cwd)
  try {
    const base = join(homedir(), ".config", "opencode", "openhermes", "ohc-pruner")
    if (!existsSync(base)) mkdirSync(base, { recursive: true })
    writeFileSync(p, JSON.stringify(_globalState, null, 2), "utf8")
  } catch {}
}

export function syncBlockToState(state: SessionState, cwd: string): void {
  if (!_globalState) loadState(cwd)
  if (_globalState) {
    _globalState.blocks = state.blocks.map(b => ({
      id: b.id,
      runId: b.runId,
      topic: b.topic,
      batchTopic: b.batchTopic,
      startId: b.startId,
      endId: b.endId,
      mode: b.mode,
      summary: b.summary,
      summaryTokens: b.summaryTokens,
      createdAt: new Date(b.createdAt).toISOString(),
      appliedAt: b.appliedAt ? new Date(b.appliedAt).toISOString() : null,
      deactivatedAt: b.deactivatedAt ? new Date(b.deactivatedAt).toISOString() : null,
      compressMessageId: b.compressMessageId,
      compressCallId: b.compressCallId,
      anchorMessageId: b.anchorMessageId,
      messageIds: b.messageIds,
      consumedBlockIds: b.consumedBlockIds,
      summaryMessageId: `${COMPRESSED_BLOCK_HEADER}:${b.id}`,
    }))
    _globalState.decompressedBlocks = state.decompressedBlocks.map(b => ({
      id: b.id,
      runId: b.runId,
      topic: b.topic,
      batchTopic: b.batchTopic,
      startId: b.startId,
      endId: b.endId,
      mode: b.mode,
      summary: b.summary,
      summaryTokens: b.summaryTokens,
      createdAt: new Date(b.createdAt).toISOString(),
      appliedAt: b.appliedAt ? new Date(b.appliedAt).toISOString() : null,
      deactivatedAt: b.deactivatedAt ? new Date(b.deactivatedAt).toISOString() : null,
      compressMessageId: b.compressMessageId,
      compressCallId: b.compressCallId,
      anchorMessageId: b.anchorMessageId,
      messageIds: b.messageIds,
      consumedBlockIds: b.consumedBlockIds,
    }))
    _globalState.manualMode = state.manualMode
    if (state.stats) {
      _globalState.stats = { ..._globalState.stats as Record<string, unknown>, ...state.stats }
    }
    saveState(cwd)
  }
}
