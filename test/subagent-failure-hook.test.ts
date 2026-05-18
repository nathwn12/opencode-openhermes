import { describe, it, before } from "node:test"
import assert from "node:assert/strict"
import { HookPhase, HookResult } from "../harness/lib/hooks/types.ts"
import type { HookContext } from "../harness/lib/hooks/types.ts"
import {
  subagentFailureHook,
  resetSubagentFailures,
  getSubagentFailureCount,
} from "../harness/lib/hooks/builtins/subagent-failure-hook.ts"
import { DEFAULT_GUARD_CONFIG } from "../harness/lib/guards/guard-config.ts"
import type { GuardConfig } from "../harness/lib/guards/guard-config.ts"

/** Build a minimal HookContext for testing */
function makeContext(sessionId: string, extras?: Partial<HookContext>): HookContext {
  return {
    sessionId,
    agent: "test",
    directory: "/tmp",
    sessions: new Map(),
    ...extras,
  } as HookContext
}

describe("subagent-failure-hook", () => {
  let ctx: HookContext

  before(() => {
    resetSubagentFailures()
  })

  // -----------------------------------------------------------------------
  // Hook metadata
  // -----------------------------------------------------------------------
  it("has correct metadata — name, type, phase, priority", () => {
    assert.equal(subagentFailureHook.metadata.name, "subagent-failure")
    assert.equal(subagentFailureHook.metadata.priority, 45)
    assert.equal(subagentFailureHook.metadata.phase, HookPhase.LATE)
    assert.deepEqual(subagentFailureHook.metadata.dependencies, [])
    assert.equal(subagentFailureHook.metadata.errorHandling, "isolate")
  })

  // -----------------------------------------------------------------------
  // Normal operation — clean output
  // -----------------------------------------------------------------------
  it("passes through clean output without incrementing failures", async () => {
    resetSubagentFailures()
    const sid = "clean-test"
    ctx = makeContext(sid)

    const result = await subagentFailureHook.execute(ctx, "All systems normal. Task completed successfully.")

    assert.equal(result.result, HookResult.CONTINUE)
    assert.equal(getSubagentFailureCount(sid), 0)
  })

  // -----------------------------------------------------------------------
  // Failure counting
  // -----------------------------------------------------------------------
  it("increments failure count on error output", async () => {
    resetSubagentFailures()
    const sid = "fail-count-test"
    ctx = makeContext(sid)

    await subagentFailureHook.execute(ctx, "Error: connection refused")
    assert.equal(getSubagentFailureCount(sid), 1)
  })

  it("detects failure from empty output", async () => {
    resetSubagentFailures()
    const sid = "empty-output-test"
    ctx = makeContext(sid)

    await subagentFailureHook.execute(ctx, "")
    assert.equal(getSubagentFailureCount(sid), 1)
  })

  // -----------------------------------------------------------------------
  // Multiple failures accumulate
  // -----------------------------------------------------------------------
  it("accumulates multiple successive failures", async () => {
    resetSubagentFailures()
    const sid = "multi-fail-test"
    ctx = makeContext(sid)

    await subagentFailureHook.execute(ctx, "Error: timeout")
    await subagentFailureHook.execute(ctx, "Exception: null pointer")
    await subagentFailureHook.execute(ctx, "FAILED with code 1")

    assert.equal(getSubagentFailureCount(sid), 3)
  })

  it("resets counter on success after failures", async () => {
    resetSubagentFailures()
    const sid = "success-after-fail"
    ctx = makeContext(sid)

    await subagentFailureHook.execute(ctx, "Error: crash")
    await subagentFailureHook.execute(ctx, "Execution failed")
    assert.equal(getSubagentFailureCount(sid), 2)

    await subagentFailureHook.execute(ctx, "All good, task done")
    assert.equal(getSubagentFailureCount(sid), 0)
  })

  // -----------------------------------------------------------------------
  // Reset
  // -----------------------------------------------------------------------
  it("resetSubagentFailures clears all counters when called without sessionId", async () => {
    resetSubagentFailures()
    const sid = "reset-all"
    ctx = makeContext(sid)

    await subagentFailureHook.execute(ctx, "Error: whoops")
    assert.equal(getSubagentFailureCount(sid), 1)

    resetSubagentFailures()
    assert.equal(getSubagentFailureCount(sid), 0)
  })

  it("resetSubagentFailures clears single session when called with sessionId", async () => {
    resetSubagentFailures()
    const sid1 = "session-a"
    const sid2 = "session-b"

    await subagentFailureHook.execute(makeContext(sid1), "Error: a")
    await subagentFailureHook.execute(makeContext(sid2), "Error: b")

    assert.equal(getSubagentFailureCount(sid1), 1)
    assert.equal(getSubagentFailureCount(sid2), 1)

    resetSubagentFailures(sid1)
    assert.equal(getSubagentFailureCount(sid1), 0)
    assert.equal(getSubagentFailureCount(sid2), 1)
  })

  // -----------------------------------------------------------------------
  // Guard escalation — stop at maxSubagentFailures (default 5)
  // -----------------------------------------------------------------------
  it("returns INJECT with BLOCKER when maxSubagentFailures is reached", async () => {
    resetSubagentFailures()
    const sid = "stop-test"
    ctx = makeContext(sid)

    // 5 failures should hit the limit (default = 5)
    for (let i = 0; i < 4; i++) {
      await subagentFailureHook.execute(ctx, "Error: attempt")
    }
    // 4 failures so far — not yet at stop
    assert.equal(getSubagentFailureCount(sid), 4)

    // 5th failure triggers stop
    const result = await subagentFailureHook.execute(ctx, "Error: final")
    assert.equal(result.result, HookResult.INJECT)
    assert.match(result.injectRecovery ?? "", /BLOCKER/)
    assert.match(result.injectRecovery ?? "", /5 consecutive/)
    assert.equal(getSubagentFailureCount(sid), 5)
  })

  it("annotates context at warn/escalate levels without stopping", async () => {
    resetSubagentFailures()
    const sid = "annotate-test"
    ctx = makeContext(sid)

    // 3/5 = 60% -> warn threshold
    await subagentFailureHook.execute(ctx, "Error: 1")
    await subagentFailureHook.execute(ctx, "Error: 2")
    const result3 = await subagentFailureHook.execute(ctx, "Error: 3")

    assert.equal(result3.result, HookResult.CONTINUE)
    assert.equal(ctx._guardProgression?.level, "warn")
    assert.equal(ctx._subagentFailures, 3)

    // 4/5 = 80% -> escalate threshold
    const result4 = await subagentFailureHook.execute(ctx, "Error: 4")
    assert.equal(result4.result, HookResult.CONTINUE)
    assert.equal(ctx._guardProgression?.level, "escalate")
    assert.equal(ctx._subagentFailures, 4)
  })

  // -----------------------------------------------------------------------
  // Disabled when maxSubagentFailures <= 0
  // -----------------------------------------------------------------------
  it("returns CONTINUE without tracking when maxSubagentFailures is 0", async () => {
    resetSubagentFailures()
    const sid = "disabled-test"
    ctx = makeContext(sid, {
      _guardConfig: { ...DEFAULT_GUARD_CONFIG, maxSubagentFailures: 0 },
    })

    const result = await subagentFailureHook.execute(ctx, "Error: disabled")
    assert.equal(result.result, HookResult.CONTINUE)
    assert.equal(getSubagentFailureCount(sid), 0)
  })
})
