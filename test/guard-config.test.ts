import { describe, it } from "node:test"
import assert from "node:assert/strict"
import {
  DEFAULT_GUARD_CONFIG,
  checkGuardProgression,
  mergeGuardConfig,
} from "../harness/lib/guards/guard-config.ts"
import type { GuardConfig, GuardLevel } from "../harness/lib/guards/guard-config.ts"

describe("guard-config", () => {
  // -----------------------------------------------------------------------
  // DEFAULT_GUARD_CONFIG
  // -----------------------------------------------------------------------
  it("DEFAULT_GUARD_CONFIG has all required fields with correct types", () => {
    const cfg: GuardConfig = DEFAULT_GUARD_CONFIG

    assert.equal(typeof cfg.maxSkillRepeats, "number")
    assert.equal(typeof cfg.maxUnproductiveHops, "number")
    assert.equal(typeof cfg.maxDelegationDepth, "number")
    assert.equal(typeof cfg.maxConsecutiveAnomalies, "number")
    assert.equal(typeof cfg.maxSubagentFailures, "number")
    assert.equal(typeof cfg.progressiveGuards, "boolean")
    assert.equal(typeof cfg.progressiveWarnThreshold, "number")
    assert.equal(typeof cfg.progressiveEscalateThreshold, "number")
  })

  it("DEFAULT_GUARD_CONFIG has expected default values", () => {
    assert.equal(DEFAULT_GUARD_CONFIG.maxSkillRepeats, 5)
    assert.equal(DEFAULT_GUARD_CONFIG.maxUnproductiveHops, 8)
    assert.equal(DEFAULT_GUARD_CONFIG.maxDelegationDepth, 25)
    assert.equal(DEFAULT_GUARD_CONFIG.maxConsecutiveAnomalies, 2)
    assert.equal(DEFAULT_GUARD_CONFIG.maxSubagentFailures, 5)
    assert.equal(DEFAULT_GUARD_CONFIG.progressiveGuards, true)
    assert.equal(DEFAULT_GUARD_CONFIG.progressiveWarnThreshold, 0.6)
    assert.equal(DEFAULT_GUARD_CONFIG.progressiveEscalateThreshold, 0.8)
  })

  // -----------------------------------------------------------------------
  // checkGuardProgression — with progressiveGuards
  // -----------------------------------------------------------------------
  it("checkGuardProgression returns 'ok' when current is 0", () => {
    const result = checkGuardProgression(0, 5, DEFAULT_GUARD_CONFIG)
    assert.equal(result.level, "ok" satisfies GuardLevel)
    assert.equal(result.current, 0)
    assert.equal(result.limit, 5)
  })

  it("checkGuardProgression returns 'warn' when at warn threshold (3/5 = 0.6)", () => {
    const result = checkGuardProgression(3, 5, DEFAULT_GUARD_CONFIG)
    assert.equal(result.level, "warn" satisfies GuardLevel)
    assert.equal(result.current, 3)
  })

  it("checkGuardProgression returns 'escalate' when at escalate threshold (4/5 = 0.8)", () => {
    const result = checkGuardProgression(4, 5, DEFAULT_GUARD_CONFIG)
    assert.equal(result.level, "escalate" satisfies GuardLevel)
    assert.equal(result.current, 4)
  })

  it("checkGuardProgression returns 'stop' when current >= limit", () => {
    const result = checkGuardProgression(5, 5, DEFAULT_GUARD_CONFIG)
    assert.equal(result.level, "stop" satisfies GuardLevel)
    assert.equal(result.current, 5)
  })

  it("checkGuardProgression returns 'stop' when current exceeds limit", () => {
    const result = checkGuardProgression(7, 5, DEFAULT_GUARD_CONFIG)
    assert.equal(result.level, "stop" satisfies GuardLevel)
    assert.equal(result.current, 7)
  })

  it("checkGuardProgression with limit=0 returns 'stop' (0 >= 0)", () => {
    const result = checkGuardProgression(0, 0, DEFAULT_GUARD_CONFIG)
    assert.equal(result.level, "stop" satisfies GuardLevel)
  })

  it("checkGuardProgression with limit=0 and high current returns 'stop'", () => {
    const result = checkGuardProgression(100, 0, DEFAULT_GUARD_CONFIG)
    assert.equal(result.level, "stop" satisfies GuardLevel)
  })

  // -----------------------------------------------------------------------
  // checkGuardProgression — without progressiveGuards
  // -----------------------------------------------------------------------
  it("checkGuardProgression with progressiveGuards=false: ok below limit, stop at limit", () => {
    const noProg: GuardConfig = { ...DEFAULT_GUARD_CONFIG, progressiveGuards: false }

    assert.equal(checkGuardProgression(0, 5, noProg).level, "ok")
    assert.equal(checkGuardProgression(3, 5, noProg).level, "ok")
    assert.equal(checkGuardProgression(4, 5, noProg).level, "ok")
    assert.equal(checkGuardProgression(5, 5, noProg).level, "stop")
    assert.equal(checkGuardProgression(6, 5, noProg).level, "stop")
  })

  // -----------------------------------------------------------------------
  // mergeGuardConfig
  // -----------------------------------------------------------------------
  it("mergeGuardConfig with no args returns a copy of DEFAULT_GUARD_CONFIG", () => {
    const result = mergeGuardConfig()
    // Deep equal, not same reference
    assert.notStrictEqual(result, DEFAULT_GUARD_CONFIG)
    assert.deepEqual(result, DEFAULT_GUARD_CONFIG)
  })

  it("mergeGuardConfig with single override merges correctly", () => {
    const result = mergeGuardConfig({ maxSkillRepeats: 10 })
    assert.equal(result.maxSkillRepeats, 10)
    // Other fields remain default
    assert.equal(result.maxUnproductiveHops, DEFAULT_GUARD_CONFIG.maxUnproductiveHops)
    assert.equal(result.maxDelegationDepth, DEFAULT_GUARD_CONFIG.maxDelegationDepth)
  })

  it("mergeGuardConfig with multiple overrides: later wins", () => {
    const result = mergeGuardConfig(
      { maxSkillRepeats: 1, maxDelegationDepth: 5 },
      { maxSkillRepeats: 99 },
    )
    assert.equal(result.maxSkillRepeats, 99)
    assert.equal(result.maxDelegationDepth, 5)
    assert.equal(result.maxSubagentFailures, DEFAULT_GUARD_CONFIG.maxSubagentFailures)
  })

  it("mergeGuardConfig filters out undefined overrides", () => {
    const result = mergeGuardConfig(undefined, { maxSkillRepeats: 3 }, undefined)
    assert.equal(result.maxSkillRepeats, 3)
    assert.equal(result.maxUnproductiveHops, DEFAULT_GUARD_CONFIG.maxUnproductiveHops)
  })

  it("mergeGuardConfig with only undefined returns DEFAULT", () => {
    const result = mergeGuardConfig(undefined)
    assert.deepEqual(result, DEFAULT_GUARD_CONFIG)
  })
})
