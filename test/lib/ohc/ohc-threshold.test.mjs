import { describe, it } from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"

describe("OHC Threshold Gates", () => {
  it("fresh empty chat returns DISABLED_BELOW_THRESHOLD", async () => {
    const { evaluateState, OHC_STATES } = await import("../../../lib/ohc/policy.mjs")
    const result = evaluateState(0, { max: 150000, min: 50000 })
    assert.equal(result.state, OHC_STATES.DISABLED_BELOW_THRESHOLD)
  })

  it("single user message returns DISABLED_BELOW_THRESHOLD", async () => {
    const { evaluateState, OHC_STATES } = await import("../../../lib/ohc/policy.mjs")
    const result = evaluateState(100, { max: 150000, min: 50000 })
    assert.equal(result.state, OHC_STATES.DISABLED_BELOW_THRESHOLD)
  })

  it("49,999 tokens returns DISABLED_BELOW_THRESHOLD", async () => {
    const { evaluateState, OHC_STATES } = await import("../../../lib/ohc/policy.mjs")
    const result = evaluateState(49999, { max: 150000, min: 50000 })
    assert.equal(result.state, OHC_STATES.DISABLED_BELOW_THRESHOLD)
  })

  it("exactly 50,000 tokens returns EVALUATION_ALLOWED", async () => {
    const { evaluateState, OHC_STATES } = await import("../../../lib/ohc/policy.mjs")
    const result = evaluateState(50000, { max: 150000, min: 50000 })
    assert.equal(result.state, OHC_STATES.EVALUATION_ALLOWED)
  })

  it("50,001 tokens returns EVALUATION_ALLOWED", async () => {
    const { evaluateState, OHC_STATES } = await import("../../../lib/ohc/policy.mjs")
    const result = evaluateState(50001, { max: 150000, min: 50000 })
    assert.equal(result.state, OHC_STATES.EVALUATION_ALLOWED)
  })

  it("100,000+ tokens returns ACTION_REQUIRED", async () => {
    const { evaluateState, OHC_STATES } = await import("../../../lib/ohc/policy.mjs")
    const result = evaluateState(100000, { max: 100000, min: 50000 })
    assert.equal(result.state, OHC_STATES.ACTION_REQUIRED)
  })

  it("isBelowThreshold returns true for DISABLED_BELOW_THRESHOLD", async () => {
    const { evaluateState, isBelowThreshold, OHC_STATES } = await import("../../../lib/ohc/policy.mjs")
    const below = evaluateState(0, { max: 150000, min: 50000 })
    assert.equal(below.state, OHC_STATES.DISABLED_BELOW_THRESHOLD)
    assert.equal(isBelowThreshold(below), true)

    const above = evaluateState(50000, { max: 150000, min: 50000 })
    assert.equal(above.state, OHC_STATES.EVALUATION_ALLOWED)
    assert.equal(isBelowThreshold(above), false)
  })

  it("isMutationAllowed returns false below threshold", async () => {
    const { evaluateState, isMutationAllowed, OHC_STATES } = await import("../../../lib/ohc/policy.mjs")
    const below = evaluateState(0, { max: 150000, min: 50000 })
    assert.equal(below.state, OHC_STATES.DISABLED_BELOW_THRESHOLD)
    assert.equal(isMutationAllowed(below), false)

    const above = evaluateState(50000, { max: 150000, min: 50000 })
    assert.equal(above.state, OHC_STATES.EVALUATION_ALLOWED)
    assert.equal(isMutationAllowed(above), true)
  })

  it("evaluateState decision record contains action and reason", async () => {
    const { evaluateState } = await import("../../../lib/ohc/policy.mjs")
    const result = evaluateState(1000, { max: 150000, min: 50000 })
    assert.equal(result.decision.action, "noop")
    assert.ok(result.decision.reason.includes("Below min threshold"), `reason: ${result.decision.reason}`)
    assert.equal(result.decision.measuredTokens, 1000)
  })

  it("zero minThreshold allows evaluation at any positive token count", async () => {
    const { evaluateState, OHC_STATES } = await import("../../../lib/ohc/policy.mjs")
    const result = evaluateState(1000, { max: 150000, min: 0 })
    assert.equal(result.state, OHC_STATES.EVALUATION_ALLOWED)
  })

  it("pct calculation is correct", async () => {
    const { evaluateState } = await import("../../../lib/ohc/policy.mjs")
    const result = evaluateState(75000, { max: 150000, min: 50000 })
    assert.equal(result.state, "EVALUATION_ALLOWED")
    assert.equal(result.pct, 0.5)
  })

  it("NaN tokens reaches NO_ACTION state", async () => {
    const { evaluateState, OHC_STATES } = await import("../../../lib/ohc/policy.mjs")
    const result = evaluateState(NaN, { max: 150000, min: 50000 })
    assert.equal(result.state, OHC_STATES.NO_ACTION)
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
})

describe("OHC Presets", () => {
  it("DEFAULTS includes preset: default", async () => {
    const { DEFAULTS } = await import("../../../lib/ohc/config.mjs")
    assert.equal(DEFAULTS.preset, "default")
  })

  it("preset soft sets behavior ratios", async () => {
    const { applyPreset, PRESET_BEHAVIOR } = await import("../../../lib/ohc/config.mjs")
    const cfg = { preset: "soft", max: 150000, min: 50000 }
    applyPreset(cfg)
    assert.equal(cfg._effectiveMaxTrigger, 165000)
    assert.equal(cfg._effectiveTargetFloor, 112500)
    assert.equal(cfg._hardCeiling, false)
    assert.equal(cfg.max, 150000)
    assert.equal(cfg.min, 50000)
  })

  it("preset hard sets aggressive ratios", async () => {
    const { applyPreset, PRESET_BEHAVIOR } = await import("../../../lib/ohc/config.mjs")
    const cfg = { preset: "hard", max: 100000, min: 40000 }
    applyPreset(cfg)
    assert.equal(cfg._effectiveMaxTrigger, 80000)
    assert.equal(cfg._effectiveTargetFloor, 35000)
    assert.equal(cfg._hardCeiling, true)
    assert.equal(cfg.max, 100000)
  })

  it("preset default sets balanced ratios", async () => {
    const { applyPreset } = await import("../../../lib/ohc/config.mjs")
    const cfg = { preset: "default", max: 100000, min: 50000 }
    applyPreset(cfg)
    assert.equal(cfg._effectiveMaxTrigger, 95000)
    assert.equal(cfg._effectiveTargetFloor, 55000)
    assert.equal(cfg._hardCeiling, true)
  })

  it("unknown preset leaves effective values undefined", async () => {
    const { applyPreset } = await import("../../../lib/ohc/config.mjs")
    const cfg = { preset: "bogus", max: 100000, min: 40000 }
    applyPreset(cfg)
    assert.equal(cfg._effectiveMaxTrigger, undefined)
    assert.equal(cfg._effectiveTargetFloor, undefined)
  })

  it("preset field traverses loadConfig and computes effective values", async () => {
    const { loadConfig } = await import("../../../lib/ohc/config.mjs")
    const cfg = loadConfig()
    assert.ok(["soft", "default", "hard"].includes(cfg.preset))
    assert.ok(typeof cfg._effectiveMaxTrigger === "number")
    assert.ok(typeof cfg._effectiveTargetFloor === "number")
  })
})

describe("OHC JSONC Config", () => {
  it("getDefaultJsoncContent produces parseable JSONC with 6 fields", async () => {
    const mod = await import("../../../lib/ohc/config.mjs")
    const content = mod.getDefaultJsoncContent({
      enabled: true,
      preset: "default",
      notification: "chat",
      notificationMode: "detailed",
      max: 100000,
      min: 50000,
    })
    const stripped = content
      .replace(/"(?:[^"\\]|\\.)*"|\/\/.*/gm, m => m.startsWith('"') ? m : "")
      .replace(/\/\*[\s\S]*?\*\//g, "")
    const parsed = JSON.parse(stripped)
    assert.equal(parsed.enabled, true)
    assert.equal(parsed.preset, "default")
    assert.equal(parsed.notification, "chat")
    assert.equal(parsed.notificationMode, "detailed")
    assert.equal(parsed.max, 100000)
    assert.equal(parsed.min, 50000)
    assert.equal(Object.keys(parsed).length, 6)
  })

  it("JSONC with comments round-trips via loadFile-equivalent parse", async () => {
    const mod = await import("../../../lib/ohc/config.mjs")
    const content = mod.getDefaultJsoncContent({
      enabled: true, preset: "default", notification: "toast", notificationMode: "minimal",
      max: 120000, min: 30000,
    })
    const tmpFile = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "ohc-jsonc-")), "test.jsonc")
    fs.mkdirSync(path.dirname(tmpFile), { recursive: true })
    fs.writeFileSync(tmpFile, content + "\n", "utf8")

    const raw = fs.readFileSync(tmpFile, "utf8")
    assert.ok(raw.includes("//"), "JSONC should contain comments")

    const stripped = raw
      .replace(/"(?:[^"\\]|\\.)*"|\/\/.*/gm, m => m.startsWith('"') ? m : "")
      .replace(/\/\*[\s\S]*?\*\//g, "")
    const parsed = JSON.parse(stripped)
    assert.equal(parsed.enabled, true)
    assert.equal(parsed.preset, "default")
    assert.equal(parsed.max, 120000)
    assert.equal(parsed.min, 30000)

    try { fs.rmSync(path.dirname(tmpFile), { recursive: true }) } catch {}
  })
})
