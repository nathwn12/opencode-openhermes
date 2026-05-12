import { describe, it } from "node:test"
import assert from "node:assert/strict"

describe("OHC Threshold Gates", () => {
  it("fresh empty chat returns DISABLED_BELOW_THRESHOLD", async () => {
    const { evaluateState, OHC_STATES } = await import("../../../lib/ohc/policy.mjs")
    const result = evaluateState(0, 50000, 150000, {}, { currentTurn: 0, manualMode: false, hasPriorState: false })
    assert.equal(result.state, OHC_STATES.DISABLED_BELOW_THRESHOLD)
  })

  it("single user message returns DISABLED_BELOW_THRESHOLD", async () => {
    const { evaluateState, OHC_STATES } = await import("../../../lib/ohc/policy.mjs")
    const result = evaluateState(100, 50000, 150000, {}, { currentTurn: 1, manualMode: false, hasPriorState: false })
    assert.equal(result.state, OHC_STATES.DISABLED_BELOW_THRESHOLD)
  })

  it("49,999 tokens returns DISABLED_BELOW_THRESHOLD", async () => {
    const { evaluateState, OHC_STATES } = await import("../../../lib/ohc/policy.mjs")
    const result = evaluateState(49999, 50000, 150000, {}, { currentTurn: 1, manualMode: false, hasPriorState: false })
    assert.equal(result.state, OHC_STATES.DISABLED_BELOW_THRESHOLD)
  })

  it("exactly 50,000 tokens returns EVALUATION_ALLOWED", async () => {
    const { evaluateState, OHC_STATES } = await import("../../../lib/ohc/policy.mjs")
    const result = evaluateState(50000, 50000, 150000, {}, { currentTurn: 1, manualMode: false, hasPriorState: false })
    assert.equal(result.state, OHC_STATES.EVALUATION_ALLOWED)
  })

  it("50,001 tokens returns EVALUATION_ALLOWED", async () => {
    const { evaluateState, OHC_STATES } = await import("../../../lib/ohc/policy.mjs")
    const result = evaluateState(50001, 50000, 150000, {}, { currentTurn: 1, manualMode: false, hasPriorState: false })
    assert.equal(result.state, OHC_STATES.EVALUATION_ALLOWED)
  })

  it("150,000+ tokens returns ACTION_REQUIRED", async () => {
    const { evaluateState, OHC_STATES } = await import("../../../lib/ohc/policy.mjs")
    const result = evaluateState(150000, 50000, 150000, {}, { currentTurn: 1, manualMode: false, hasPriorState: false })
    assert.equal(result.state, OHC_STATES.ACTION_REQUIRED)
  })

  it("manualMode active returns MANUAL_OVERRIDE regardless of tokens", async () => {
    const { evaluateState, OHC_STATES } = await import("../../../lib/ohc/policy.mjs")
    const result = evaluateState(0, 50000, 150000, { manualMode: { enabled: true } }, { manualMode: "active" })
    assert.equal(result.state, OHC_STATES.MANUAL_OVERRIDE)
  })

  it("isBelowThreshold returns true for DISABLED_BELOW_THRESHOLD", async () => {
    const { evaluateState, isBelowThreshold, OHC_STATES } = await import("../../../lib/ohc/policy.mjs")
    const below = evaluateState(0, 50000, 150000, {}, { currentTurn: 0, manualMode: false, hasPriorState: false })
    assert.equal(below.state, OHC_STATES.DISABLED_BELOW_THRESHOLD)
    assert.equal(isBelowThreshold(below), true)

    const above = evaluateState(50000, 50000, 150000, {}, { currentTurn: 1, manualMode: false, hasPriorState: false })
    assert.equal(above.state, OHC_STATES.EVALUATION_ALLOWED)
    assert.equal(isBelowThreshold(above), false)
  })

  it("isMutationAllowed returns false below threshold", async () => {
    const { evaluateState, isMutationAllowed, OHC_STATES } = await import("../../../lib/ohc/policy.mjs")
    const below = evaluateState(0, 50000, 150000, {}, { currentTurn: 0, manualMode: false, hasPriorState: false })
    assert.equal(below.state, OHC_STATES.DISABLED_BELOW_THRESHOLD)
    assert.equal(isMutationAllowed(below), false)

    const above = evaluateState(50000, 50000, 150000, {}, { currentTurn: 1, manualMode: false, hasPriorState: false })
    assert.equal(above.state, OHC_STATES.EVALUATION_ALLOWED)
    assert.equal(isMutationAllowed(above), true)
  })

  it("isNudgeAllowed returns false below threshold", async () => {
    const { evaluateState, isNudgeAllowed, OHC_STATES } = await import("../../../lib/ohc/policy.mjs")
    const below = evaluateState(0, 50000, 150000, {}, { currentTurn: 0, manualMode: false, hasPriorState: false })
    assert.equal(below.state, OHC_STATES.DISABLED_BELOW_THRESHOLD)
    assert.equal(isNudgeAllowed(below), false)

    const above = evaluateState(50000, 50000, 150000, {}, { currentTurn: 1, manualMode: false, hasPriorState: false })
    assert.equal(above.state, OHC_STATES.EVALUATION_ALLOWED)
    assert.equal(isNudgeAllowed(above), true)
  })

  it("isActionAllowed returns false for EVALUATION_ALLOWED", async () => {
    const { evaluateState, isActionAllowed, OHC_STATES } = await import("../../../lib/ohc/policy.mjs")
    const evalState = evaluateState(50000, 50000, 150000, {}, { currentTurn: 1, manualMode: false, hasPriorState: false })
    assert.equal(evalState.state, OHC_STATES.EVALUATION_ALLOWED)
    assert.equal(isActionAllowed(evalState), false)

    const actionState = evaluateState(150000, 50000, 150000, {}, { currentTurn: 1, manualMode: false, hasPriorState: false })
    assert.equal(actionState.state, OHC_STATES.ACTION_REQUIRED)
    assert.equal(isActionAllowed(actionState), true)
  })

  it("evaluateState decision record contains action and reason", async () => {
    const { evaluateState } = await import("../../../lib/ohc/policy.mjs")
    const result = evaluateState(1000, 50000, 150000, {}, { currentTurn: 1, manualMode: false, hasPriorState: false })
    assert.equal(result.decision.action, "noop")
    assert.ok(result.decision.reason.includes("Below min threshold"), `reason: ${result.decision.reason}`)
    assert.equal(result.decision.measuredTokens, 1000)
  })

  it("first chat detection works", async () => {
    const { evaluateState } = await import("../../../lib/ohc/policy.mjs")
    const firstChat = evaluateState(0, 50000, 150000, {}, { currentTurn: 0, hasPriorState: false })
    assert.equal(firstChat.isFirstChat, true)

    const notFirstChat = evaluateState(0, 50000, 150000, {}, { currentTurn: 0, hasPriorState: true })
    assert.equal(notFirstChat.isFirstChat, false)
  })

  it("createSessionState has ohcFirstMessageAt null", async () => {
    const { createSessionState } = await import("../../../lib/ohc/state.mjs")
    const state = createSessionState()
    assert.equal(state.ohcFirstMessageAt, null)
  })

  it("serialize/deserialize round-trips ohcFirstMessageAt", async () => {
    const { createSessionState, serializeState, deserializeState } = await import("../../../lib/ohc/state.mjs")
    const state = createSessionState()
    state.ohcFirstMessageAt = 123456789
    const serialized = serializeState(state)
    const restored = deserializeState(serialized)
    assert.equal(restored.ohcFirstMessageAt, 123456789)
  })

  it("zero minThreshold allows evaluation at any positive token count", async () => {
    const { evaluateState, OHC_STATES } = await import("../../../lib/ohc/policy.mjs")
    const result = evaluateState(1000, 0, 150000, {}, { currentTurn: 1, manualMode: false, hasPriorState: false })
    assert.equal(result.state, OHC_STATES.EVALUATION_ALLOWED)
  })

  it("pct calculation is correct", async () => {
    const { evaluateState } = await import("../../../lib/ohc/policy.mjs")
    const result = evaluateState(75000, 50000, 150000, {}, { currentTurn: 1, manualMode: false, hasPriorState: false })
    assert.equal(result.state, "EVALUATION_ALLOWED")
    assert.equal(result.pct, 0.5)
  })

  it("NaN tokens reaches NO_ACTION state", async () => {
    const { evaluateState, OHC_STATES } = await import("../../../lib/ohc/policy.mjs")
    const result = evaluateState(NaN, 50000, 150000, {}, { currentTurn: 1, manualMode: false, hasPriorState: false })
    assert.equal(result.state, OHC_STATES.NO_ACTION)
  })
})

describe("OHC Presets", () => {
  it("DEFAULTS includes preset: default", async () => {
    const { loadConfig } = await import("../../../lib/ohc/config.mjs")
    const cfg = loadConfig()
    assert.equal(cfg.preset, "default")
  })

  it("preset safe sets conservative values", async () => {
    const { applyPreset } = await import("../../../lib/ohc/config.mjs")
    const cfg = {
      preset: "safe",
      compress: { nudgeFrequency: 5, iterationNudgeThreshold: 25, protectedTools: [], protectUserMessages: false, summaryBuffer: true },
      strategies: { deduplication: { enabled: true, protectedTools: [] }, purgeErrors: { enabled: true, turns: 4, protectedTools: [] } },
      turnProtection: { enabled: false, turns: 4 },
    }
    applyPreset(cfg)
    assert.equal(cfg.compress.nudgeFrequency, 10)
    assert.equal(cfg.compress.iterationNudgeThreshold, 50)
    assert.equal(cfg.strategies.deduplication.enabled, false)
    assert.equal(cfg.strategies.purgeErrors.turns, 8)
    assert.equal(cfg.turnProtection.enabled, false)
    assert.equal(cfg.turnProtection.turns, 0)
  })

  it("preset max sets aggressive values", async () => {
    const { applyPreset } = await import("../../../lib/ohc/config.mjs")
    const cfg = {
      preset: "max",
      compress: { nudgeFrequency: 5, iterationNudgeThreshold: 25, protectedTools: [], protectUserMessages: false, summaryBuffer: true },
      strategies: { deduplication: { enabled: true, protectedTools: [] }, purgeErrors: { enabled: true, turns: 4, protectedTools: [] } },
      turnProtection: { enabled: false, turns: 4 },
    }
    applyPreset(cfg)
    assert.equal(cfg.compress.nudgeFrequency, 2)
    assert.equal(cfg.compress.iterationNudgeThreshold, 10)
    assert.equal(cfg.strategies.deduplication.enabled, true)
    assert.equal(cfg.strategies.purgeErrors.turns, 2)
    assert.equal(cfg.turnProtection.enabled, true)
    assert.equal(cfg.turnProtection.turns, 4)
  })

  it("user-set values survive preset override", async () => {
    const { applyPreset } = await import("../../../lib/ohc/config.mjs")
    const cfg = {
      preset: "safe",
      compress: { nudgeFrequency: 1, iterationNudgeThreshold: 50, protectedTools: [], protectUserMessages: false, summaryBuffer: true },
      strategies: { deduplication: { enabled: false, protectedTools: [] }, purgeErrors: { enabled: true, turns: 4, protectedTools: [] } },
      turnProtection: { enabled: true, turns: 2 },
    }
    applyPreset(cfg)
    assert.equal(cfg.compress.nudgeFrequency, 1)
    assert.equal(cfg.compress.iterationNudgeThreshold, 50)
    assert.equal(cfg.strategies.deduplication.enabled, false)
    assert.equal(cfg.strategies.purgeErrors.turns, 8)
    assert.equal(cfg.turnProtection.enabled, true)
    assert.equal(cfg.turnProtection.turns, 2)
  })

  it("unknown preset ignored", async () => {
    const { applyPreset } = await import("../../../lib/ohc/config.mjs")
    const cfg = {
      preset: "unknown_value",
      compress: { nudgeFrequency: 5, iterationNudgeThreshold: 25, protectedTools: [], protectUserMessages: false, summaryBuffer: true },
      strategies: { deduplication: { enabled: true, protectedTools: [] }, purgeErrors: { enabled: true, turns: 4, protectedTools: [] } },
      turnProtection: { enabled: false, turns: 4 },
    }
    applyPreset(cfg)
    assert.equal(cfg.compress.nudgeFrequency, 5)
    assert.equal(cfg.strategies.purgeErrors.turns, 4)
  })

  it("preset default leaves everything at defaults", async () => {
    const { applyPreset } = await import("../../../lib/ohc/config.mjs")
    const cfg = {
      preset: "default",
      compress: { nudgeFrequency: 5, iterationNudgeThreshold: 25, protectedTools: [], protectUserMessages: false, summaryBuffer: true },
      strategies: { deduplication: { enabled: true, protectedTools: [] }, purgeErrors: { enabled: true, turns: 4, protectedTools: [] } },
      turnProtection: { enabled: false, turns: 4 },
    }
    applyPreset(cfg)
    assert.equal(cfg.compress.nudgeFrequency, 5)
    assert.equal(cfg.compress.iterationNudgeThreshold, 25)
    assert.equal(cfg.strategies.deduplication.enabled, true)
    assert.equal(cfg.strategies.purgeErrors.turns, 4)
    assert.equal(cfg.turnProtection.enabled, false)
  })

  it("preset field traverses mergeLayer", async () => {
    const { loadConfig } = await import("../../../lib/ohc/config.mjs")
    const cfg = loadConfig()
    assert.ok(["safe", "default", "max"].includes(cfg.preset))
  })

  it("preset safe does NOT override user-set min/max", async () => {
    const { loadConfig } = await import("../../../lib/ohc/config.mjs")
    const cfg = loadConfig()
    assert.ok(cfg.min >= 10000)
    assert.ok(cfg.max > cfg.min)
  })
})
