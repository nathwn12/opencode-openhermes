import { describe, it } from "node:test"
import assert from "node:assert/strict"
import { HookPhase, HookResult } from "../harness/lib/hooks/types.ts"
import type { HookContext } from "../harness/lib/hooks/types.ts"
import { nextRouteHook } from "../harness/lib/hooks/builtins/next-route-hook.ts"
import type { RuntimeRouteDecision } from "../harness/lib/routing/types.ts"

/** Build a minimal HookContext for testing RouteHook */
function makeContext(extras?: Partial<HookContext>): HookContext {
  return {
    sessionId: "test-session",
    agent: "test",
    directory: "/tmp",
    sessions: new Map(),
    ...extras,
  } as HookContext
}

describe("next-route-hook", () => {
  // -----------------------------------------------------------------------
  // Hook metadata
  // -----------------------------------------------------------------------
  it("has correct metadata — name, type, phase, priority", () => {
    assert.equal(nextRouteHook.metadata.name, "next-route")
    assert.equal(nextRouteHook.metadata.priority, 90)
    assert.equal(nextRouteHook.metadata.phase, HookPhase.EARLY)
    assert.deepEqual(nextRouteHook.metadata.dependencies, [])
    assert.equal(nextRouteHook.metadata.errorHandling, "isolate")
  })

  // -----------------------------------------------------------------------
  // No _nextRoute — pass through
  // -----------------------------------------------------------------------
  it("passes route through unchanged when context has no _nextRoute", async () => {
    const ctx = makeContext()
    const result = await nextRouteHook.execute(ctx, "oh-planner")
    assert.equal(result.result, HookResult.CONTINUE)
    assert.equal(result.modifiedRoute, "oh-planner")
  })

  // -----------------------------------------------------------------------
  // _nextRoute is undefined in context — pass through
  // -----------------------------------------------------------------------
  it("passes route through when _nextRoute is undefined", async () => {
    const ctx = makeContext({ _nextRoute: undefined })
    const result = await nextRouteHook.execute(ctx, "oh-builder")
    assert.equal(result.result, HookResult.CONTINUE)
    assert.equal(result.modifiedRoute, "oh-builder")
  })

  // -----------------------------------------------------------------------
  // _nextRoute.selected set — overrides route
  // -----------------------------------------------------------------------
  it("overrides route destination when _nextRoute.selected is set", async () => {
    const override: RuntimeRouteDecision = {
      selected: "oh-ship",
      source: "next_route",
    }
    const ctx = makeContext({ _nextRoute: override })
    const result = await nextRouteHook.execute(ctx, "oh-planner")
    assert.equal(result.result, HookResult.CONTINUE)
    assert.equal(result.modifiedRoute, "oh-ship")
  })

  // -----------------------------------------------------------------------
  // Same route — passes through (doesn't change it)
  // -----------------------------------------------------------------------
  it("passes route through when _nextRoute.selected matches current route", async () => {
    const override: RuntimeRouteDecision = {
      selected: "oh-planner",
      source: "next_route",
    }
    const ctx = makeContext({ _nextRoute: override })
    const result = await nextRouteHook.execute(ctx, "oh-planner")
    assert.equal(result.result, HookResult.CONTINUE)
    assert.equal(result.modifiedRoute, "oh-planner")
  })

  // -----------------------------------------------------------------------
  // _nextRoute.selected is null — pass through
  // -----------------------------------------------------------------------
  it("passes route through when _nextRoute.selected is empty string", async () => {
    // The hook checks `!nextRoute` so empty string is falsy
    const override: RuntimeRouteDecision = {
      selected: "",
      source: "next_route",
    }
    const ctx = makeContext({ _nextRoute: override })
    const result = await nextRouteHook.execute(ctx, "oh-builder")
    assert.equal(result.result, HookResult.CONTINUE)
    assert.equal(result.modifiedRoute, "oh-builder")
  })

  // -----------------------------------------------------------------------
  // _nextRoute with full decision fields — overrides
  // -----------------------------------------------------------------------
  it("overrides route with full RuntimeRouteDecision object", async () => {
    const override: RuntimeRouteDecision = {
      selected: "oh-investigate",
      source: "next_route",
      reason: "User asked to debug",
      candidates: ["oh-planner", "oh-investigate"],
    }
    const ctx = makeContext({ _nextRoute: override })
    const result = await nextRouteHook.execute(ctx, "oh-planner")
    assert.equal(result.result, HookResult.CONTINUE)
    assert.equal(result.modifiedRoute, "oh-investigate")
  })
})
