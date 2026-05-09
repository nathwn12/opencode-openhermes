import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs"
import { join } from "node:path"
import { homedir } from "node:os"
import { createHash } from "node:crypto"

export const COMPRESSED_BLOCK_HEADER = "ohc-summary"

let _globalState = null

export function createSessionState() {
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
    blocks: [],
    blockIdCounter: 0,
    decompressedBlocks: [],
    toolCache: {},
    toolIdList: [],
    messageIds: new Map(),
    rawIdToRef: new Map(),
    refToRawId: new Map(),
    cachedMessages: null,
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
  }
}

export function allocateBlockId(state) {
  state.blockIdCounter++
  return `b${state.blockIdCounter}`
}

export function allocateRunId(state) {
  state.compressionRunCounter++
  return `run-${state.compressionRunCounter}`
}

export function allocateMessageRef(state) {
  state.refCounter++
  return `m${String(state.refCounter).padStart(4, "0")}`
}

export function wrapCompressedSummary(blockId, summary) {
  return `<${COMPRESSED_BLOCK_HEADER} id="${blockId}">\n${summary}\n</${COMPRESSED_BLOCK_HEADER}>`
}

export function applyCompressionState(state, meta, selection, anchorMessageId, blockId, storedSummary, consumedBlockIds) {
  const block = {
    id: blockId,
    runId: meta.runId || allocateRunId(state),
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

  return block
}

export function findBlockByMessageId(state, messageId) {
  return state.blocks.find(b => b.messageIds?.includes(messageId) || b.id === messageId || b.compressMessageId === messageId)
}

export function findBlockById(state, blockId) {
  return state.blocks.find(b => b.id === blockId)
}

export function decompressBlock(state, blockId) {
  const idx = state.blocks.findIndex(b => b.id === blockId)
  if (idx === -1) return null
  const block = state.blocks[idx]
  block.deactivatedAt = Date.now()
  state.decompressedBlocks.push(block)
  state.blocks.splice(idx, 1)
  return block
}

export function recompressBlock(state, blockId) {
  const idx = state.decompressedBlocks.findIndex(b => b.id === blockId)
  if (idx === -1) return null
  const block = state.decompressedBlocks[idx]
  block.deactivatedAt = null
  block.appliedAt = Date.now()
  state.blocks.push(block)
  state.decompressedBlocks.splice(idx, 1)
  return block
}

export function findRecompressibleBlocks(state) {
  return state.decompressedBlocks.filter(b => !b.deactivatedAt || (Date.now() - b.deactivatedAt) < 86400000)
}

function getStatePath(cwd) {
  const base = join(homedir(), ".config", "opencode", "openhermes", "ohc-pruner")
  if (!existsSync(base)) mkdirSync(base, { recursive: true })
  const hash = createHash("sha256").update(cwd || process.cwd() || homedir()).digest("hex").slice(0, 15)
  return join(base, `${hash}.json`)
}

export function loadState(cwd) {
  if (_globalState) return _globalState
  const p = getStatePath(cwd)
  try {
    if (existsSync(p)) {
      const data = JSON.parse(readFileSync(p, "utf8"))
      _globalState = data
      return data
    }
  } catch {}
  _globalState = { version: 2, workspace: cwd, updatedAt: new Date().toISOString(), blocks: [], stats: { totalCompressed: 0, totalSavedTokens: 0, compressionCount: 0, dedupCount: 0, purgeCount: 0 } }
  return _globalState
}

export function saveState(cwd) {
  if (!_globalState) return
  _globalState.updatedAt = new Date().toISOString()
  const p = getStatePath(cwd)
  try {
    const base = join(homedir(), ".config", "opencode", "openhermes", "ohc-pruner")
    if (!existsSync(base)) mkdirSync(base, { recursive: true })
    writeFileSync(p, JSON.stringify(_globalState, null, 2), "utf8")
  } catch {}
}

export function syncBlockToState(state, cwd) {
  if (!_globalState) loadState(cwd)
  if (_globalState) {
    _globalState.blocks = state.blocks.map(b => ({
      id: b.id,
      topic: b.topic,
      startId: b.startId,
      endId: b.endId,
      summary: b.summary,
      createdAt: new Date(b.createdAt).toISOString(),
      appliedAt: b.appliedAt ? new Date(b.appliedAt).toISOString() : null,
      summaryMessageId: `${COMPRESSED_BLOCK_HEADER}:${b.id}`,
    }))
    if (state.stats) {
      _globalState.stats = { ..._globalState.stats, ...state.stats }
    }
    saveState(cwd)
  }
}
