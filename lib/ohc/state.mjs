import fs from "node:fs"
import fsp from "node:fs/promises"
import path from "node:path"
import os from "node:os"
import { createLogger } from "../logger.mjs"

const log = createLogger("ohc-state")

const STATE_DIR = path.join(os.homedir(), ".local", "share", "opencode", "ohc")
const LEGACY_FILE = path.join(os.homedir(), ".local", "share", "opencode", "ohc-state.json")

function sessionPath(sessionId) {
  const safe = sessionId.replace(/[^a-zA-Z0-9_-]/g, "_")
  return path.join(STATE_DIR, `${safe}.json`)
}

function ensureDir() {
  fs.mkdirSync(STATE_DIR, { recursive: true })
}

function migrateLegacy() {
  try {
    if (!fs.existsSync(LEGACY_FILE)) return
    const raw = JSON.parse(fs.readFileSync(LEGACY_FILE, "utf8"))
    if (typeof raw !== "object") return
    ensureDir()
    for (const [sid, data] of Object.entries(raw)) {
      const sp = sessionPath(sid)
      if (!fs.existsSync(sp)) {
        fs.writeFileSync(sp, JSON.stringify({ ...data, migratedFrom: "legacy" }, null, 2), "utf8")
      }
    }
    fs.renameSync(LEGACY_FILE, LEGACY_FILE + ".bak")
  } catch {}
}

migrateLegacy()

export function loadOhcState(sessionId) {
  if (!sessionId) return null
  try {
    return JSON.parse(fs.readFileSync(sessionPath(sessionId), "utf8"))
  } catch {
    return null
  }
}

export function saveOhcState(sessionId, data) {
  if (!sessionId) return
  try {
    ensureDir()
    fs.writeFileSync(sessionPath(sessionId), JSON.stringify({ ...data, updatedAt: new Date().toISOString() }, null, 2), "utf8")
  } catch (err) {
    log.error("Failed to persist session state:", err?.message)
  }
}

export function createSessionState() {
  return {
    sessionId: null,
    isSubAgent: false,
    prune: {
      tools: new Map(),
      messages: {
        byMessageId: new Map(),
        blocksById: new Map(),
        activeBlockIds: new Set(),
        activeByAnchorMessageId: new Map(),
        nextBlockId: 1,
        nextRunId: 1,
      },
    },
    stats: {
      pruneTokenCounter: 0,
      totalPruneTokens: 0,
    },
    toolParameters: new Map(),
    toolIdList: [],
    messageIds: { byRawId: new Map(), byRef: new Map(), nextRef: 1 },
    lastCompaction: 0,
    currentTurn: 0,
    compressionTiming: { starts: new Map(), pendingByCallId: new Map(), lastDurationMs: 0, totalDurationMs: 0 },
    lastAutoPruneAt: null,
    ohcFirstMessageAt: null,
    prunedIds: new Set(),
    summary: null,
    anchorMessageId: null,
    totalTokensSaved: 0,
    totalMessagesRemoved: 0,
    blockCount: 0,
    _subAgentChecked: false,
    subAgentResultCache: new Map(),
  }
}

export function resetOhcState(ss) {
  ss.prune.tools.clear()
  ss.prune.messages.blocksById.clear()
  ss.prune.messages.byMessageId.clear()
  ss.prune.messages.activeBlockIds.clear()
  ss.prune.messages.activeByAnchorMessageId?.clear()
  ss.prunedIds.clear()
  ss.messageIds.byRawId.clear()
  ss.messageIds.byRef.clear()
  ss.messageIds.nextRef = 1
  ss.toolParameters.clear()
  ss.toolIdList = []
  ss.summary = null
  ss.anchorMessageId = null
  ss.lastAutoPruneAt = null
  ss._pruneCycleDone = false
  ss._subAgentChecked = false
  ss.isSubAgent = false
  ss.blockCount = 0
  ss.totalTokensSaved = 0
  ss.totalMessagesRemoved = 0
  ss.subAgentResultCache?.clear()
  ss.lastCompaction = Date.now()
}

function pruneMapToObj(map) {
  return Object.fromEntries(map)
}

function pruneMapFromObj(obj) {
  if (!obj || typeof obj !== "object") return new Map()
  return new Map(Object.entries(obj))
}

function filterAnchors(arr) {
  if (!Array.isArray(arr)) return []
  return [...new Set(arr.filter(a => typeof a === "string" && a.length > 0))]
}

function setToArr(s) {
  return [...s]
}

function setFromArr(a) {
  return new Set(Array.isArray(a) ? a : [])
}

export function serializeState(state) {
  return {
    sessionId: state.sessionId,
    lastCompaction: state.lastCompaction,
    currentTurn: state.currentTurn,
    stats: { ...state.stats },
    prune: {
      tools: pruneMapToObj(state.prune.tools),
      messages: {
        nextBlockId: state.prune?.messages?.nextBlockId || 1,
        nextRunId: state.prune?.messages?.nextRunId || 1,
        blocksById: pruneMapToObj(state.prune?.messages?.blocksById),
        byMessageId: pruneMapToObj(state.prune?.messages?.byMessageId),
        activeBlockIds: setToArr(state.prune?.messages?.activeBlockIds),
      },
    },
    lastAutoPruneAt: state.lastAutoPruneAt,
    totalTokensSaved: state.totalTokensSaved,
    totalMessagesRemoved: state.totalMessagesRemoved,
    blockCount: state.blockCount,
    ohcFirstMessageAt: state.ohcFirstMessageAt || null,
    summary: state.summary,
    anchorMessageId: state.anchorMessageId,
    prunedIds: setToArr(state.prunedIds),
    isSubAgent: state.isSubAgent || false,
    _subAgentChecked: state._subAgentChecked || false,
    messageIds: {
      byRawId: pruneMapToObj(state.messageIds?.byRawId),
      byRef: pruneMapToObj(state.messageIds?.byRef),
      nextRef: state.messageIds?.nextRef || 1,
    },
    compressionTiming: {
      starts: Object.fromEntries(state.compressionTiming?.starts || new Map()),
      pendingByCallId: pruneMapToObj(state.compressionTiming?.pendingByCallId || new Map()),
      lastDurationMs: state.compressionTiming?.lastDurationMs || 0,
      totalDurationMs: state.compressionTiming?.totalDurationMs || 0,
    },
  }
}

export function deserializeState(saved) {
  const state = createSessionState()
  if (!saved) return state
  state.sessionId = saved.sessionId || null
  state.lastCompaction = saved.lastCompaction || 0
  state.currentTurn = saved.currentTurn || 0
  if (saved.stats) Object.assign(state.stats, saved.stats)
  if (saved.prune?.tools) state.prune.tools = pruneMapFromObj(saved.prune.tools)
  if (saved.prune?.messages) {
    const pm = saved.prune.messages
    state.prune.messages.nextBlockId = pm.nextBlockId || 1
    state.prune.messages.nextRunId = pm.nextRunId || 1
    state.prune.messages.blocksById = pruneMapFromObj(pm.blocksById)
    state.prune.messages.byMessageId = pruneMapFromObj(pm.byMessageId)
    state.prune.messages.activeBlockIds = setFromArr(filterAnchors(pm.activeBlockIds))
    for (const [, block] of state.prune.messages.blocksById) {
      if (block) {
        block.includedBlockIds ??= []
        block.parentBlockIds ??= []
        block.directMessageIds ??= []
        block.directToolIds ??= []
        block.effectiveMessageIds ??= []
        block.effectiveToolIds ??= []
      }
    }
  }
  state.lastAutoPruneAt = saved.lastAutoPruneAt || null
  state.totalTokensSaved = saved.totalTokensSaved || 0
  state.totalMessagesRemoved = saved.totalMessagesRemoved || 0
  state.blockCount = saved.blockCount || 0
  state.ohcFirstMessageAt = saved.ohcFirstMessageAt || null
  state.summary = saved.summary || null
  state.anchorMessageId = saved.anchorMessageId || null
  state.prunedIds = setFromArr(filterAnchors(saved.prunedIds))
  if (saved.compressionTiming) {
    state.compressionTiming.starts = pruneMapFromObj(saved.compressionTiming.starts)
    state.compressionTiming.lastDurationMs = saved.compressionTiming.lastDurationMs || 0
    state.compressionTiming.totalDurationMs = saved.compressionTiming.totalDurationMs || 0
  }
  if (saved.messageIds) {
    state.messageIds.byRawId = pruneMapFromObj(saved.messageIds.byRawId)
    state.messageIds.byRef = pruneMapFromObj(saved.messageIds.byRef)
    state.messageIds.nextRef = saved.messageIds.nextRef || 1
  }
  if (saved.isSubAgent !== undefined) state.isSubAgent = saved.isSubAgent
  if (saved._subAgentChecked !== undefined) state._subAgentChecked = saved._subAgentChecked
  return state
}

export function buildToolIdList(state, messages) {
  const ids = []
  for (const msg of messages) {
    if (!Array.isArray(msg.parts)) continue
    for (const part of msg.parts) {
      if (part.type === "tool" && part.callID) {
        ids.push(part.callID)
      }
    }
  }
  state.toolIdList = ids
  return ids
}

export function syncToolCache(state, messages) {
  let userTurn = 0
  for (const msg of messages) {
    const hasUserText = msg.info?.role === "user" && msg.parts?.some(p => p.type === "text" && p.text?.trim())
    if (hasUserText) userTurn++
    if (!Array.isArray(msg.parts)) continue
    for (const part of msg.parts) {
      if (part.type !== "tool" || !part.callID) continue
      const existing = state.toolParameters.get(part.callID)
      if (existing) {
        existing.status = part.state?.status || existing.status
        continue
      }
      state.toolParameters.set(part.callID, {
        tool: part.tool || "unknown",
        parameters: part.state?.input || {},
        status: part.state?.status || "pending",
        turn: userTurn,
        tokenCount: estimateToolTokens(part),
        lastSeen: Date.now(),
      })
    }
  }
  state.currentTurn = Math.max(state.currentTurn, userTurn)
}

import { countTokens } from "./tokenizer.mjs"

function estimateToolTokens(part) {
  if (!part.state) return 0
  let t = 0
  if (part.state.input) t += countTokens(JSON.stringify(part.state.input))
  if (part.state.output) {
    t += countTokens(typeof part.state.output === "string" ? part.state.output : JSON.stringify(part.state.output ?? ""))
  }
  return Math.ceil(t)
}

export function countTurns(state, messages) {
  let userCount = 0
  for (const msg of messages) {
    if (msg.info?.role === "user") {
      const parts = Array.isArray(msg.parts) ? msg.parts : []
      const hasText = parts.some(p => p.type === "text" && p.text?.trim())
      if (hasText) userCount++
    }
  }
  return userCount
}
