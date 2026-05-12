import { describe, it } from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"

// ── Fix 1: totalMessagesRemoved in state lifecycle ──────────────────

describe("Fix 1: totalMessagesRemoved persisted in state lifecycle", () => {
  it("createSessionState includes totalMessagesRemoved: 0", async () => {
    const { createSessionState } = await import("../../../lib/ohc/state.mjs")
    const state = createSessionState()
    assert.equal(state.totalMessagesRemoved, 0)
  })

  it("serializeState includes totalMessagesRemoved", async () => {
    const { createSessionState, serializeState } = await import("../../../lib/ohc/state.mjs")
    const state = createSessionState()
    state.totalMessagesRemoved = 42
    const serialized = serializeState(state)
    assert.equal(serialized.totalMessagesRemoved, 42)
  })

  it("deserializeState restores totalMessagesRemoved", async () => {
    const { deserializeState } = await import("../../../lib/ohc/state.mjs")
    const state = deserializeState({ totalMessagesRemoved: 99 })
    assert.equal(state.totalMessagesRemoved, 99)
  })

  it("deserializeState defaults to 0 when missing", async () => {
    const { deserializeState } = await import("../../../lib/ohc/state.mjs")
    const state = deserializeState({})
    assert.equal(state.totalMessagesRemoved, 0)
  })
})

// ── Fix 2: msgTokens exported ──────────────────────────────────────

describe("Fix 2: msgTokens exported from reaper.mjs", () => {
  it("msgTokens is exported and computes message token count", async () => {
    const { msgTokens } = await import("../../../lib/ohc/reaper.mjs")
    const msg = {
      parts: [
        { type: "text", text: "hello world" },
      ],
    }
    const tokens = msgTokens(msg)
    assert.equal(tokens, Math.ceil("hello world".length / 4))
  })

  it("msgTokens handles tool parts", async () => {
    const { msgTokens } = await import("../../../lib/ohc/reaper.mjs")
    const msg = {
      parts: [
        { type: "tool", state: { input: { a: 1 }, output: "ok" } },
      ],
    }
    const tokens = msgTokens(msg)
    assert.ok(tokens > 0)
  })
})

// ── Fix 3a: applyCompress save ordering ────────────────────────────

describe("Fix 3a: counters persisted to disk after increments", () => {
  it("saveOhcState round-trips totalMessagesRemoved, blockCount, totalTokensSaved", async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "ohc-test-"))
    const origHome = process.env.HOME
    const origUserProfile = process.env.USERPROFILE
    process.env.HOME = tmpDir
    process.env.USERPROFILE = tmpDir

    try {
      const { createSessionState, serializeState, deserializeState, saveOhcState, loadOhcState } = await import("../../../lib/ohc/state.mjs")
      const sessionId = "test-session-fix3a"

      const ss = createSessionState()
      ss.sessionId = sessionId

      ss.totalMessagesRemoved += 5
      ss.blockCount++
      ss.totalTokensSaved += 1000
      saveOhcState(sessionId, serializeState(ss))

      const loaded = deserializeState(loadOhcState(sessionId))
      assert.equal(loaded.totalMessagesRemoved, 5)
      assert.equal(loaded.blockCount, 1)
      assert.equal(loaded.totalTokensSaved, 1000)
    } finally {
      process.env.HOME = origHome
      process.env.USERPROFILE = origUserProfile
      try { fs.rmSync(tmpDir, { recursive: true }) } catch {}
    }
  })
})

// ── Fix 3b: executeRangeCompress token computation ─────────────────

describe("Fix 3b: range mode stores compressedTokens in block record", () => {
  it("applyCompressionState with compressedTokens stores non-zero value", async () => {
    const { applyCompressionState } = await import("../../../lib/ohc/compress/state.mjs")
    const { createSessionState } = await import("../../../lib/ohc/state.mjs")

    const ss = createSessionState()
    const selection = { messageIds: ["m1", "m2"], requiredBlockIds: [] }

    applyCompressionState(ss, {
      topic: "test",
      batchTopic: "test",
      startId: "ohc0001",
      endId: "ohc0002",
      mode: "range",
      runId: 1,
      compressMessageId: "m1",
      compressCallId: "call1",
      summaryTokens: 10,
      compressedTokens: 5432,
    }, selection, "m1", 1, "summary", [])

    const block = ss.prune.messages.blocksById.get(1)
    assert.equal(block.compressedTokens, 5432)
  })

  it("applyCompressionState defaults to 0 when no compressedTokens in input", async () => {
    const { applyCompressionState } = await import("../../../lib/ohc/compress/state.mjs")
    const { createSessionState } = await import("../../../lib/ohc/state.mjs")

    const ss = createSessionState()
    const selection = { messageIds: ["m1"], requiredBlockIds: [] }

    applyCompressionState(ss, {
      topic: "test",
      batchTopic: "test",
      startId: "ohc0001",
      endId: "ohc0002",
      mode: "range",
      runId: 1,
      compressMessageId: "m1",
      compressCallId: "call1",
      summaryTokens: 10,
    }, selection, "m1", 1, "summary", [])

    const block = ss.prune.messages.blocksById.get(1)
    assert.equal(block.compressedTokens, 0)
  })
})

// ── Fix 4: notification uses cumulative state ──────────────────────

describe("Fix 4: notification derives counters from ss object", () => {
  it("sendCompressNotification uses ss.totalMessagesRemoved for progress bar", async () => {
    const { sendCompressNotification } = await import("../../../lib/ohc/notify.mjs")

    const ss = { totalTokensSaved: 50000, blockCount: 5, totalMessagesRemoved: 200 }

    let capturedMessage
    const fakeClient = {
      tui: { showToast: async (opts) => { capturedMessage = opts.body.message } },
      session: { prompt: async () => {} },
    }

    await sendCompressNotification(
      fakeClient, "session1",
      { notification: "toast", notificationMode: "detailed" },
      15, "test summary", 3000, ss, 85,
    )

    assert.ok(capturedMessage.includes("30% active"), `expected "30% active" in message, got: ${JSON.stringify(capturedMessage)}`)
    assert.ok(capturedMessage.includes("50K"))
    assert.ok(capturedMessage.includes("#5"))
  })

  it("sendCompressNotification minimal mode works", async () => {
    const { sendCompressNotification } = await import("../../../lib/ohc/notify.mjs")

    const ss = { totalTokensSaved: 1000, blockCount: 1, totalMessagesRemoved: 10 }

    let capturedMessage
    const fakeClient = {
      tui: { showToast: async (opts) => { capturedMessage = opts.body.message } },
      session: { prompt: async () => {} },
    }

    await sendCompressNotification(
      fakeClient, "session1",
      { notification: "toast", notificationMode: "minimal" },
      5, "test", 500, ss, 50,
    )

    assert.ok(capturedMessage.includes("1K"))
  })
})

// ── Fix 5: /ohc status uses effectiveMax ───────────────────────────

describe("Fix 5: OhcPlugin exports as function", () => {
  it("OhcPlugin is a function and returns hooks", async () => {
    const { OhcPlugin } = await import("../../../lib/ohc/pruner.mjs")
    const plugin = await OhcPlugin({})
    assert.equal(typeof plugin["experimental.chat.system.transform"], "function")
    assert.equal(typeof plugin["experimental.chat.messages.transform"], "function")
    assert.equal(typeof plugin["command.execute.before"], "function")
  })
})
