import fs from "node:fs"
import path from "node:path"
import os from "node:os"

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
  ensureDir()
  fs.writeFileSync(sessionPath(sessionId), JSON.stringify({ ...data, updatedAt: new Date().toISOString() }, null, 2), "utf8")
}


export function createSessionState() {
  return {
    sessionId: null,
    isSubAgent: false,
    manualMode: false,
    pendingManualTrigger: null,
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
    nudges: {
      contextLimitAnchors: new Set(),
      turnNudgeAnchors: new Set(),
      iterationNudgeAnchors: new Set(),
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
    modelContextLimit: undefined,
    systemPromptTokens: undefined,
    protectedTurns: { enabled: false, turns: 0 },
    compressionTiming: { starts: new Map(), pendingByCallId: new Map(), lastDurationMs: 0, totalDurationMs: 0 },
    lastNudgePct: 0,
    lastAutoPruneAt: null,
    prunedIds: new Set(),
    summary: null,
    anchorMessageId: null,
    totalTokensSaved: 0,
    totalMessagesRemoved: 0,
    blockCount: 0,
  }
}

function pruneMapToObj(map) {
  return Object.fromEntries(map)
}

function pruneMapFromObj(obj) {
  if (!obj || typeof obj !== "object") return new Map()
  return new Map(Object.entries(obj))
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
    manualMode: state.manualMode,
    lastCompaction: state.lastCompaction,
    currentTurn: state.currentTurn,
    modelContextLimit: state.modelContextLimit,
    systemPromptTokens: state.systemPromptTokens,
    stats: { ...state.stats },
    nudges: {
      contextLimitAnchors: setToArr(state.nudges.contextLimitAnchors),
      turnNudgeAnchors: setToArr(state.nudges.turnNudgeAnchors),
      iterationNudgeAnchors: setToArr(state.nudges.iterationNudgeAnchors),
    },
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
    summary: state.summary,
    anchorMessageId: state.anchorMessageId,
    prunedIds: setToArr(state.prunedIds),
    isSubAgent: state.isSubAgent || false,
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
  state.manualMode = saved.manualMode || false
  state.lastCompaction = saved.lastCompaction || 0
  state.currentTurn = saved.currentTurn || 0
  state.modelContextLimit = saved.modelContextLimit
  state.systemPromptTokens = saved.systemPromptTokens
  if (saved.stats) Object.assign(state.stats, saved.stats)
  if (saved.nudges) {
    state.nudges.contextLimitAnchors = setFromArr(saved.nudges.contextLimitAnchors)
    state.nudges.turnNudgeAnchors = setFromArr(saved.nudges.turnNudgeAnchors)
    state.nudges.iterationNudgeAnchors = setFromArr(saved.nudges.iterationNudgeAnchors)
  }
  if (saved.prune?.tools) state.prune.tools = pruneMapFromObj(saved.prune.tools)
  if (saved.prune?.messages) {
    const pm = saved.prune.messages
    state.prune.messages.nextBlockId = pm.nextBlockId || 1
    state.prune.messages.nextRunId = pm.nextRunId || 1
    state.prune.messages.blocksById = pruneMapFromObj(pm.blocksById)
    state.prune.messages.byMessageId = pruneMapFromObj(pm.byMessageId)
    state.prune.messages.activeBlockIds = setFromArr(pm.activeBlockIds)
  }
  state.lastAutoPruneAt = saved.lastAutoPruneAt || null
  state.totalTokensSaved = saved.totalTokensSaved || 0
  state.totalMessagesRemoved = saved.totalMessagesRemoved || 0
  state.blockCount = saved.blockCount || 0
  state.summary = saved.summary || null
  state.anchorMessageId = saved.anchorMessageId || null
    state.prunedIds = setFromArr(saved.prunedIds)
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
  let maxTurn = 0
  for (const msg of messages) {
    if (msg.info?.role === "user") {
      const lastUser = state.toolIdList.length > 0
      if (lastUser) maxTurn++
    }
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
        turn: maxTurn,
        tokenCount: estimateToolTokens(part),
        lastSeen: Date.now(),
      })
    }
  }
  state.currentTurn = Math.max(state.currentTurn, maxTurn)
}

function estimateToolTokens(part) {
  if (!part.state) return 0
  let t = 0
  if (part.state.input) t += JSON.stringify(part.state.input).length / 4
  if (part.state.output) {
    t += (typeof part.state.output === "string" ? part.state.output : JSON.stringify(part.state.output ?? "")).length / 4
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
