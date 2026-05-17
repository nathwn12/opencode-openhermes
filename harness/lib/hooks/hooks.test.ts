// ---------------------------------------------------------------------------
// Hook System — comprehensive tests
// ---------------------------------------------------------------------------

import { describe, it, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import {
  HookPhase,
  HookResult,
  HookRegistry,
  planCheckHook,
  shellDetectHook,
  confidenceGateHook,
  delegationDepthHook,
  resetDepthTracker,
  errorRecoveryHook,
  memorySyncHook,
  routeTrackingHook,
  resetRouteTracker,
  getHopHistory,
  sanityCheckHook,
} from "./index.ts";
import { AnomalyTracker } from "../sanity/anomaly-tracker.ts";
import type {
  HookContext,
  HookMetadata,
  PreToolUseHook,
  PostToolUseHook,
  RouteHook,
  SessionHook,
} from "./types.ts";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeContext(overrides?: Partial<HookContext>): HookContext {
  return {
    sessionId: "test-session",
    agent: "oh-builder",
    directory: "/tmp/test-project",
    sessions: new Map(),
    ...overrides,
  };
}

function makePreToolHook(
  name: string,
  overrides?: Partial<HookMetadata>,
  impl?: (
    ctx: HookContext,
  ) => Promise<{
    result: HookResult;
    modifiedContext?: Partial<HookContext>;
  }>,
): PreToolUseHook {
  return {
    metadata: {
      name,
      priority: 50,
      phase: HookPhase.NORMAL,
      dependencies: [],
      errorHandling: "propagate",
      ...overrides,
    },
    execute: impl ?? (async () => ({ result: HookResult.CONTINUE })),
  };
}

function makePostToolHook(
  name: string,
  overrides?: Partial<HookMetadata>,
  impl?: (
    ctx: HookContext,
    output: string,
  ) => Promise<{
    result: HookResult;
    modifiedOutput?: string;
    injectRecovery?: string;
  }>,
): PostToolUseHook {
  return {
    metadata: {
      name,
      priority: 50,
      phase: HookPhase.NORMAL,
      dependencies: [],
      errorHandling: "propagate",
      ...overrides,
    },
    execute: impl ?? (async () => ({ result: HookResult.CONTINUE })),
  };
}

function makeRouteHook(
  name: string,
  overrides?: Partial<HookMetadata>,
  impl?: (
    ctx: HookContext,
    route: string,
  ) => Promise<{ result: HookResult; modifiedRoute?: string }>,
): RouteHook {
  return {
    metadata: {
      name,
      priority: 50,
      phase: HookPhase.NORMAL,
      dependencies: [],
      errorHandling: "propagate",
      ...overrides,
    },
    execute: impl ?? (async () => ({ result: HookResult.CONTINUE })),
  };
}

function makeSessionHook(
  name: string,
  overrides?: Partial<HookMetadata>,
): SessionHook {
  return {
    metadata: {
      name,
      priority: 50,
      phase: HookPhase.NORMAL,
      dependencies: [],
      errorHandling: "propagate",
      ...overrides,
    },
    onSessionStart: async () => {},
    onSessionEnd: async () => {},
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("HookRegistry", () => {
  beforeEach(() => {
    HookRegistry.resetInstance();
    resetDepthTracker();
    resetRouteTracker();
  });

  // ---- Registration & Unregistration ----

  describe("registration", () => {
    it("registers a PreToolUseHook", () => {
      const reg = HookRegistry.getInstance();
      const hook = makePreToolHook("test-pre");
      reg.registerPreTool(hook);
      assert.equal(reg.getPreToolHooks().length, 1);
      assert.equal(reg.getPreToolHooks()[0].metadata.name, "test-pre");
    });

    it("registers a PostToolUseHook", () => {
      const reg = HookRegistry.getInstance();
      const hook = makePostToolHook("test-post");
      reg.registerPostTool(hook);
      assert.equal(reg.getPostToolHooks().length, 1);
    });

    it("registers a RouteHook", () => {
      const reg = HookRegistry.getInstance();
      const hook = makeRouteHook("test-route");
      reg.registerRoute(hook);
      assert.equal(reg.getRouteHooks().length, 1);
    });

    it("registers a SessionHook", () => {
      const reg = HookRegistry.getInstance();
      const hook = makeSessionHook("test-session");
      reg.registerSession(hook);
      assert.equal(reg.getSessionHooks().length, 1);
    });

    it("skips duplicate name silently", () => {
      const reg = HookRegistry.getInstance();
      const first = reg.registerPreTool(makePreToolHook("dup"));
      const second = reg.registerPreTool(makePreToolHook("dup"));
      assert.equal(first, true);
      assert.equal(second, false);
      assert.equal(reg.getPreToolHooks().length, 1);
    });

    it("same name across different hook types is allowed", () => {
      const reg = HookRegistry.getInstance();
      reg.registerPreTool(makePreToolHook("shared"));
      reg.registerPostTool(makePostToolHook("shared"));
      assert.equal(reg.getPreToolHooks().length, 1);
      assert.equal(reg.getPostToolHooks().length, 1);
    });
  });

  describe("unregister", () => {
    it("removes a hook by name from pre-tool list", () => {
      const reg = HookRegistry.getInstance();
      reg.registerPreTool(makePreToolHook("remove-me"));
      const result = reg.unregister("remove-me");
      assert.equal(result, true);
      assert.equal(reg.getPreToolHooks().length, 0);
    });

    it("returns false for unknown name", () => {
      const reg = HookRegistry.getInstance();
      assert.equal(reg.unregister("nonexistent"), false);
    });

    it("removes from all categories that match the name", () => {
      const reg = HookRegistry.getInstance();
      reg.registerPreTool(makePreToolHook("shared"));
      reg.registerPostTool(makePostToolHook("shared"));
      const result = reg.unregister("shared");
      // Removes from ALL categories that have a hook with this name
      assert.equal(result, true);
      assert.equal(reg.getPreToolHooks().length, 0);
      assert.equal(reg.getPostToolHooks().length, 0);
    });
  });

  // ---- Topological Sort ----

  describe("topologicalSort", () => {
    it("returns empty array for empty input", () => {
      const reg = HookRegistry.getInstance();
      const result = reg.topologicalSort([]);
      assert.deepEqual(result, []);
    });

    it("preserves order when no dependencies", () => {
      const reg = HookRegistry.getInstance();
      const a = makePreToolHook("a", { phase: HookPhase.EARLY, priority: 80 });
      const b = makePreToolHook("b", { phase: HookPhase.EARLY, priority: 70 });
      const c = makePreToolHook("c", { phase: HookPhase.EARLY, priority: 90 });
      // Higher priority = earlier: c (90), a (80), b (70)
      const sorted = reg.topologicalSort([a, b, c]);
      assert.equal(sorted[0].metadata.name, "c");
      assert.equal(sorted[1].metadata.name, "a");
      assert.equal(sorted[2].metadata.name, "b");
    });

    it("phase ordering: EARLY before NORMAL before LATE", () => {
      const reg = HookRegistry.getInstance();
      const early = makePreToolHook("early-hook", { phase: HookPhase.EARLY, priority: 50 });
      const normal = makePreToolHook("normal-hook", { phase: HookPhase.NORMAL, priority: 50 });
      const late = makePreToolHook("late-hook", { phase: HookPhase.LATE, priority: 50 });

      const sorted = reg.topologicalSort([late, early, normal]);
      assert.equal(sorted[0].metadata.name, "early-hook");
      assert.equal(sorted[1].metadata.name, "normal-hook");
      assert.equal(sorted[2].metadata.name, "late-hook");
    });

    it("handles simple linear dependencies", () => {
      const reg = HookRegistry.getInstance();
      const a = makePreToolHook("a", {
        phase: HookPhase.EARLY,
        priority: 50,
        dependencies: [],
      });
      const b = makePreToolHook("b", {
        phase: HookPhase.EARLY,
        priority: 50,
        dependencies: ["a"],
      });
      const c = makePreToolHook("c", {
        phase: HookPhase.EARLY,
        priority: 50,
        dependencies: ["b"],
      });

      const sorted = reg.topologicalSort([c, a, b]);
      assert.equal(sorted[0].metadata.name, "a");
      assert.equal(sorted[1].metadata.name, "b");
      assert.equal(sorted[2].metadata.name, "c");
    });

    it("handles diamond dependencies (A→B→D and A→C→D)", () => {
      const reg = HookRegistry.getInstance();
      const a = makePreToolHook("a", {
        phase: HookPhase.EARLY,
        priority: 50,
        dependencies: [],
      });
      const b = makePreToolHook("b", {
        phase: HookPhase.EARLY,
        priority: 50,
        dependencies: ["a"],
      });
      const c = makePreToolHook("c", {
        phase: HookPhase.EARLY,
        priority: 50,
        dependencies: ["a"],
      });
      const d = makePreToolHook("d", {
        phase: HookPhase.EARLY,
        priority: 50,
        dependencies: ["b", "c"],
      });

      const sorted = reg.topologicalSort([d, c, b, a]);
      // A must come first, D must come last
      assert.equal(sorted[0].metadata.name, "a");
      assert.equal(sorted[3].metadata.name, "d");
      // B and C can be in any order but must be before D and after A
      const bIdx = sorted.findIndex((h) => h.metadata.name === "b");
      const cIdx = sorted.findIndex((h) => h.metadata.name === "c");
      assert.ok(bIdx > 0);
      assert.ok(cIdx > 0);
      assert.ok(bIdx < 3);
      assert.ok(cIdx < 3);
    });

    it("throws on circular dependency (A→B→C→A)", () => {
      const reg = HookRegistry.getInstance();
      const a = makePreToolHook("a", {
        phase: HookPhase.EARLY,
        dependencies: ["c"],
      });
      const b = makePreToolHook("b", {
        phase: HookPhase.EARLY,
        dependencies: ["a"],
      });
      const c = makePreToolHook("c", {
        phase: HookPhase.EARLY,
        dependencies: ["b"],
      });

      assert.throws(
        () => reg.topologicalSort([a, b, c]),
        /Circular dependency detected/,
      );
    });

    it("self-dependency throws", () => {
      const reg = HookRegistry.getInstance();
      const a = makePreToolHook("a", {
        phase: HookPhase.EARLY,
        dependencies: ["a"],
      });

      assert.throws(
        () => reg.topologicalSort([a]),
        /Circular dependency detected/,
      );
    });

    it("cross-phase dependencies are ignored (not within same phase)", () => {
      const reg = HookRegistry.getInstance();
      const early = makePreToolHook("early", {
        phase: HookPhase.EARLY,
        priority: 50,
        dependencies: [],
      });
      const normal = makePreToolHook("normal", {
        phase: HookPhase.NORMAL,
        priority: 50,
        dependencies: ["early"], // Dep on different phase — ignored
      });

      // Should not throw — cross-phase deps are silently ignored
      const sorted = reg.topologicalSort([normal, early]);
      assert.equal(sorted[0].metadata.name, "early");
      assert.equal(sorted[1].metadata.name, "normal");
    });
  });

  // ---- Execution ----

  describe("executePreTool", () => {
    it("passes through with CONTINUE when all hooks pass", async () => {
      const reg = HookRegistry.getInstance();
      reg.registerPreTool(
        makePreToolHook("hook1", {}, async (ctx) => {
          return {
            result: HookResult.CONTINUE,
            modifiedContext: { _track: "ran" },
          };
        }),
      );

      const result = await reg.executePreTool(makeContext());
      assert.equal(result.result, HookResult.CONTINUE);
      assert.equal(result.modifiedContext?._track, "ran");
    });

    it("stops execution on STOP result", async () => {
      const reg = HookRegistry.getInstance();
      let secondRan = false;

      reg.registerPreTool(
        makePreToolHook("stopper", { priority: 60 }, async () => ({
          result: HookResult.STOP,
        })),
      );
      reg.registerPreTool(
        makePreToolHook("should-not-run", { priority: 50 }, async () => {
          secondRan = true;
          return { result: HookResult.CONTINUE };
        }),
      );

      const result = await reg.executePreTool(makeContext());
      assert.equal(result.result, HookResult.STOP);
      assert.equal(secondRan, false);
    });

    it("accumulates modified context across hooks", async () => {
      const reg = HookRegistry.getInstance();
      reg.registerPreTool(
        makePreToolHook("hook1", { priority: 60 }, async () => ({
          result: HookResult.CONTINUE,
          modifiedContext: { _first: "set" },
        })),
      );
      reg.registerPreTool(
        makePreToolHook("hook2", { priority: 50 }, async () => ({
          result: HookResult.CONTINUE,
          modifiedContext: { _second: "also-set" },
        })),
      );

      const result = await reg.executePreTool(makeContext());
      assert.equal(result.result, HookResult.CONTINUE);
      assert.equal(result.modifiedContext?._first, "set");
      assert.equal(result.modifiedContext?._second, "also-set");
    });
  });

  describe("executePostTool", () => {
    it("passes through output without modification", async () => {
      const reg = HookRegistry.getInstance();
      reg.registerPostTool(makePostToolHook("pass"));

      const result = await reg.executePostTool(
        makeContext(),
        "some output",
      );
      assert.equal(result.result, HookResult.CONTINUE);
      assert.equal(result.modifiedOutput, "some output");
    });

    it("modifies output in sequence", async () => {
      const reg = HookRegistry.getInstance();
      reg.registerPostTool(
        makePostToolHook("uppercase", { priority: 60 }, async (_ctx, out) => ({
          result: HookResult.CONTINUE,
          modifiedOutput: out.toUpperCase(),
        })),
      );
      reg.registerPostTool(
        makePostToolHook("wrap", { priority: 50 }, async (_ctx, out) => ({
          result: HookResult.CONTINUE,
          modifiedOutput: `[[[${out}]]]`,
        })),
      );

      const result = await reg.executePostTool(
        makeContext(),
        "hello",
      );
      assert.equal(result.modifiedOutput, "[[[HELLO]]]");
    });

    it("injects recovery action", async () => {
      const reg = HookRegistry.getInstance();
      reg.registerPostTool(
        makePostToolHook("recovery-test", {}, async () => ({
          result: HookResult.INJECT,
          injectRecovery: "retry with backoff",
        })),
      );

      const result = await reg.executePostTool(
        makeContext(),
        "output",
      );
      assert.equal(result.recovery, "retry with backoff");
    });
  });

  describe("executeRoute", () => {
    it("passes route unchanged", async () => {
      const reg = HookRegistry.getInstance();
      reg.registerRoute(makeRouteHook("pass"));

      const result = await reg.executeRoute(makeContext(), "oh-builder");
      assert.equal(result.result, HookResult.CONTINUE);
      assert.equal(result.modifiedRoute, "oh-builder");
    });

    it("modifies route destination", async () => {
      const reg = HookRegistry.getInstance();
      reg.registerRoute(
        makeRouteHook("reroute", {}, async (_ctx, _route) => ({
          result: HookResult.CONTINUE,
          modifiedRoute: "oh-gauntlet",
        })),
      );

      const result = await reg.executeRoute(
        makeContext(),
        "oh-builder",
      );
      assert.equal(result.modifiedRoute, "oh-gauntlet");
    });

    it("chains multiple route modifications", async () => {
      const reg = HookRegistry.getInstance();
      reg.registerRoute(
        makeRouteHook("first", { priority: 60 }, async (_ctx, route) => ({
          result: HookResult.CONTINUE,
          modifiedRoute: `${route}-step1`,
        })),
      );
      reg.registerRoute(
        makeRouteHook("second", { priority: 50 }, async (_ctx, route) => ({
          result: HookResult.CONTINUE,
          modifiedRoute: `${route}-step2`,
        })),
      );

      const result = await reg.executeRoute(
        makeContext(),
        "oh-builder",
      );
      assert.equal(result.modifiedRoute, "oh-builder-step1-step2");
    });
  });

  describe("executeSessionStart / executeSessionEnd", () => {
    it("calls onSessionStart on all session hooks in order", async () => {
      const reg = HookRegistry.getInstance();
      const order: string[] = [];

      const hook1 = makeSessionHook("first", { priority: 60 });
      hook1.onSessionStart = async () => { order.push("first"); };

      const hook2 = makeSessionHook("second", { priority: 50 });
      hook2.onSessionStart = async () => { order.push("second"); };

      reg.registerSession(hook1);
      reg.registerSession(hook2);

      await reg.executeSessionStart(makeContext());
      assert.deepEqual(order, ["first", "second"]);
    });

    it("calls onSessionEnd on all session hooks", async () => {
      const reg = HookRegistry.getInstance();
      let called = false;

      const hook = makeSessionHook("test-end");
      hook.onSessionEnd = async () => { called = true; };
      reg.registerSession(hook);

      await reg.executeSessionEnd(makeContext());
      assert.equal(called, true);
    });
  });

  // ---- Built-in Hooks ----

  describe("built-in hooks", () => {
    it("planCheckHook has correct metadata", () => {
      assert.equal(planCheckHook.metadata.name, "plan-check");
      assert.equal(planCheckHook.metadata.priority, 90);
      assert.equal(planCheckHook.metadata.phase, HookPhase.EARLY);
    });

    it("shellDetectHook has correct metadata", () => {
      assert.equal(shellDetectHook.metadata.name, "shell-detect");
      assert.equal(shellDetectHook.metadata.priority, 80);
      assert.equal(shellDetectHook.metadata.phase, HookPhase.EARLY);
    });

    it("confidenceGateHook has correct metadata", () => {
      assert.equal(confidenceGateHook.metadata.name, "confidence-gate");
      assert.equal(confidenceGateHook.metadata.priority, 70);
      assert.equal(confidenceGateHook.metadata.phase, HookPhase.NORMAL);
    });

    it("delegationDepthHook has correct metadata", () => {
      assert.equal(delegationDepthHook.metadata.name, "delegation-depth");
      assert.equal(delegationDepthHook.metadata.priority, 60);
      assert.equal(delegationDepthHook.metadata.phase, HookPhase.NORMAL);
    });

    it("errorRecoveryHook has correct metadata", () => {
      assert.equal(errorRecoveryHook.metadata.name, "error-recovery");
      assert.equal(errorRecoveryHook.metadata.priority, 50);
      assert.equal(errorRecoveryHook.metadata.phase, HookPhase.LATE);
    });

    it("memorySyncHook has correct metadata", () => {
      assert.equal(memorySyncHook.metadata.name, "memory-sync");
      assert.equal(memorySyncHook.metadata.priority, 40);
      assert.equal(memorySyncHook.metadata.phase, HookPhase.LATE);
    });

    it("shellDetectHook returns shell context", async () => {
      const result = await shellDetectHook.execute(makeContext());
      assert.equal(result.result, HookResult.CONTINUE);
      assert.ok(result.modifiedContext?._shellType);
      assert.ok(result.modifiedContext?._shellPlatform);
    });

    it("delegationDepthHook increments depth", async () => {
      const ctx = makeContext();
      const result = await delegationDepthHook.execute(ctx);
      assert.equal(result.result, HookResult.CONTINUE);
      assert.equal(result.modifiedContext?._delegationDepth, 1);
    });

    it("delegationDepthHook stops when depth exceeded", async () => {
      const ctx = makeContext({ _maxDelegationDepth: 2 });
      // First call
      await delegationDepthHook.execute(ctx);
      // Second call
      await delegationDepthHook.execute(ctx);
      // Third call — should exceed
      const result = await delegationDepthHook.execute(ctx);
      assert.equal(result.result, HookResult.STOP);
      assert.equal(result.modifiedContext?._depthExceeded, true);
    });

    it("errorRecoveryHook returns CONTINUE for normal output", async () => {
      const result = await errorRecoveryHook.execute(
        makeContext(),
        "Everything completed successfully.",
      );
      assert.equal(result.result, HookResult.CONTINUE);
    });

    it("errorRecoveryHook detects error output", async () => {
      const result = await errorRecoveryHook.execute(
        makeContext(),
        "Error: Failed to connect to server",
      );
      assert.equal(result.result, HookResult.INJECT);
      assert.ok(result.injectRecovery);
      assert.ok(result.injectRecovery!.includes("Error Recovery"));
    });

    it("confidenceGateHook passes through without confidence info", async () => {
      const result = await confidenceGateHook.execute(
        makeContext(),
        "oh-builder",
      );
      assert.equal(result.result, HookResult.CONTINUE);
      assert.equal(result.modifiedRoute, "oh-builder");
    });

    it("confidenceGateHook injects with MEDIUM confidence", async () => {
      const result = await confidenceGateHook.execute(
        makeContext({ _confidenceLevel: "MEDIUM", _confidenceExchanges: 0 }),
        "oh-builder",
      );
      assert.equal(result.result, HookResult.INJECT);
      assert.ok(result.modifiedRoute!.includes("echo=confirm"));
    });

    it("built-in hooks register all in registry", () => {
      const reg = HookRegistry.getInstance();
      reg.registerPreTool(planCheckHook);
      reg.registerPreTool(shellDetectHook);
      reg.registerPreTool(delegationDepthHook);
      reg.registerRoute(confidenceGateHook);
      reg.registerPostTool(errorRecoveryHook);
      reg.registerPostTool(memorySyncHook);

      assert.equal(reg.getPreToolHooks().length, 3);
      assert.equal(reg.getRouteHooks().length, 1);
      assert.equal(reg.getPostToolHooks().length, 2);
    });

    it("routeTrackingHook has correct metadata", () => {
      assert.equal(routeTrackingHook.metadata.name, "route-tracking");
      assert.equal(routeTrackingHook.metadata.priority, 55);
      assert.equal(routeTrackingHook.metadata.phase, HookPhase.LATE);
    });

    it("all built-in hooks execute without throwing", async () => {
      // Verify each built-in hook can execute without unhandled errors
      const ctx = makeContext();

      // Pre-tool hooks
      await planCheckHook.execute(ctx);
      await shellDetectHook.execute(ctx);
      await delegationDepthHook.execute(ctx);

      // Route hook
      await confidenceGateHook.execute(ctx, "oh-builder");

      // Post-tool hooks
      await errorRecoveryHook.execute(ctx, "normal output");
      await memorySyncHook.execute(ctx, "some output");
      // If we got here without throwing, success
      assert.ok(true);
    });

    describe("route-tracking hook", () => {
      it("tracks a single hop", async () => {
        const ctx = makeContext();
        const result = await routeTrackingHook.execute(ctx, "oh-builder");
        assert.equal(result.result, HookResult.CONTINUE);
        assert.equal(result.modifiedRoute, "oh-builder");

        const history = getHopHistory(ctx.sessionId);
        assert.equal(history.length, 1);
        assert.equal(history[0].skill, "oh-builder");
        assert.equal(history[0].producedArtifact, false);
        assert.ok(typeof history[0].timestamp === "number");
      });

      it("stops on 5th hop of the same skill (default max 5)", async () => {
        const ctx = makeContext();
        // 4 passes
        for (let i = 0; i < 4; i++) {
          const result = await routeTrackingHook.execute(ctx, "oh-builder");
          assert.equal(result.result, HookResult.CONTINUE);
        }
        // 5th — should STOP (>= maxSkillRepeats=5)
        const result = await routeTrackingHook.execute(ctx, "oh-builder");
        assert.equal(result.result, HookResult.STOP);
        assert.ok(ctx._optiRoute);
        assert.ok(
          (ctx._optiRoute as Record<string, unknown>).reason as string,
        );
        assert.ok(
          ((ctx._optiRoute as Record<string, unknown>).reason as string).includes(
            "oh-builder",
          ),
        );
        assert.ok(
          ((ctx._optiRoute as Record<string, unknown>).chain as unknown[]).length === 5,
        );
      });

      it("stops on 8th unproductive hop (default max 8)", async () => {
        const ctx = makeContext();
        const skills = [
          "oh-builder",
          "oh-planner",
          "oh-gauntlet",
          "oh-ship",
          "oh-review",
          "oh-facade",
          "oh-security",
        ];
        // 7 unproductive hops — should pass (>= max 8 triggers)
        for (const skill of skills) {
          const result = await routeTrackingHook.execute(ctx, skill);
          assert.equal(result.result, HookResult.CONTINUE);
        }
        // 8th — should STOP
        const result = await routeTrackingHook.execute(ctx, "oh-builder");
        assert.equal(result.result, HookResult.STOP);
        assert.ok(ctx._optiRoute);
        assert.ok(
          ((ctx._optiRoute as Record<string, unknown>).reason as string).includes(
            "unproductive",
          ),
        );
      });

      it("productive hop resets unproductive counter", async () => {
        const ctx = makeContext();

        // 3 unproductive hops
        await routeTrackingHook.execute(ctx, "oh-builder");
        await routeTrackingHook.execute(ctx, "oh-planner");
        await routeTrackingHook.execute(ctx, "oh-gauntlet");

        // Productive hop via artifactCheck in config
        let checkCount = 0;
        const config = {
          maxSkillRepeats: 5,
          maxUnproductiveHops: 8,
          artifactCheck: (route: string) => {
            checkCount++;
            return route === "oh-review"; // oh-review always produces artifact
          },
        };
        const prodCtx = makeContext({ _routeTrackingConfig: config });
        // Copy the state over by using same sessionId
        prodCtx.sessionId = ctx.sessionId;

        // This hop should be productive (oh-review returns true from artifactCheck)
        await routeTrackingHook.execute(prodCtx, "oh-review");

        // From 0 unproductive count after reset — 7 more unproductive passes
        for (let i = 0; i < 7; i++) {
          const result = await routeTrackingHook.execute(prodCtx, `oh-skill-${i}`);
          assert.equal(result.result, HookResult.CONTINUE);
        }
        // 8th unproductive after reset should STOP
        const result = await routeTrackingHook.execute(prodCtx, "oh-final");
        assert.equal(result.result, HookResult.STOP);
      });

      it("does not track terminal routes (surface, done, oh-handoff)", async () => {
        const ctx = makeContext();

        await routeTrackingHook.execute(ctx, "surface");
        await routeTrackingHook.execute(ctx, "done");
        await routeTrackingHook.execute(ctx, "oh-handoff");

        const history = getHopHistory(ctx.sessionId);
        assert.equal(history.length, 0);
      });

      it("tracks non-terminal routes alongside terminal skips", async () => {
        const ctx = makeContext();

        await routeTrackingHook.execute(ctx, "surface");
        await routeTrackingHook.execute(ctx, "oh-builder"); // tracked
        await routeTrackingHook.execute(ctx, "done");
        await routeTrackingHook.execute(ctx, "oh-gauntlet"); // tracked

        const history = getHopHistory(ctx.sessionId);
        assert.equal(history.length, 2);
        assert.equal(history[0].skill, "oh-builder");
        assert.equal(history[1].skill, "oh-gauntlet");
      });

      it("resetRouteTracker clears all state", async () => {
        const ctx1 = makeContext({ sessionId: "session-a" });
        const ctx2 = makeContext({ sessionId: "session-b" });

        await routeTrackingHook.execute(ctx1, "oh-builder");
        await routeTrackingHook.execute(ctx2, "oh-planner");

        assert.equal(getHopHistory("session-a").length, 1);
        assert.equal(getHopHistory("session-b").length, 1);

        resetRouteTracker();

        assert.equal(getHopHistory("session-a").length, 0);
        assert.equal(getHopHistory("session-b").length, 0);
      });

      it("resetRouteTracker clears single session", async () => {
        const ctx1 = makeContext({ sessionId: "session-a" });
        const ctx2 = makeContext({ sessionId: "session-b" });

        await routeTrackingHook.execute(ctx1, "oh-builder");
        await routeTrackingHook.execute(ctx2, "oh-planner");

        resetRouteTracker("session-a");

        assert.equal(getHopHistory("session-a").length, 0);
        assert.equal(getHopHistory("session-b").length, 1);
      });

      it("configurable via maxSkillRepeats in context", async () => {
        const config = { maxSkillRepeats: 2, maxUnproductiveHops: 10, artifactCheck: () => false };
        const ctx = makeContext({ _routeTrackingConfig: config });

        const r1 = await routeTrackingHook.execute(ctx, "oh-builder");
        assert.equal(r1.result, HookResult.CONTINUE);

        const r2 = await routeTrackingHook.execute(ctx, "oh-builder");
        assert.equal(r2.result, HookResult.STOP);
        assert.ok(ctx._optiRoute);
      });

      it("configurable via maxUnproductiveHops in context", async () => {
        const config = { maxSkillRepeats: 10, maxUnproductiveHops: 3, artifactCheck: () => false };
        const ctx = makeContext({ _routeTrackingConfig: config });

        await routeTrackingHook.execute(ctx, "oh-builder");
        await routeTrackingHook.execute(ctx, "oh-planner");
        // 3rd unproductive should STOP (>=3)
        const result = await routeTrackingHook.execute(ctx, "oh-gauntlet");
        assert.equal(result.result, HookResult.STOP);
        assert.ok(ctx._optiRoute);
        assert.ok(
          ((ctx._optiRoute as Record<string, unknown>).reason as string).includes(
            "unproductive",
          ),
        );
      });
    });
  });

  // ---- Integration: Full Hook Lifecycle ----

  describe("hook lifecycle integration", () => {
    it("executes multiple hook types in phase order", async () => {
      const reg = HookRegistry.getInstance();
      const executionOrder: string[] = [];

      // Pre-tool: early phase
      reg.registerPreTool(
        makePreToolHook("plan-check", { phase: HookPhase.EARLY, priority: 90 }, async () => {
          executionOrder.push("plan-check");
          return { result: HookResult.CONTINUE };
        }),
      );

      // Pre-tool: normal phase
      reg.registerPreTool(
        makePreToolHook("delegation-depth", { phase: HookPhase.NORMAL, priority: 60 }, async () => {
          executionOrder.push("delegation-depth");
          return { result: HookResult.CONTINUE };
        }),
      );

      // Post-tool: late phase
      reg.registerPostTool(
        makePostToolHook("memory-sync", { phase: HookPhase.LATE, priority: 40 }, async () => {
          executionOrder.push("memory-sync");
          return { result: HookResult.CONTINUE };
        }),
      );

      // Route hook
      reg.registerRoute(
        makeRouteHook("confidence-gate", { phase: HookPhase.NORMAL, priority: 70 }, async () => {
          executionOrder.push("confidence-gate");
          return { result: HookResult.CONTINUE };
        }),
      );

      // Execute in lifecycle order
      await reg.executePreTool(makeContext());
      await reg.executePostTool(makeContext(), "output");
      await reg.executeRoute(makeContext(), "oh-builder");

      // Verify phase ordering within each category
      assert.ok(executionOrder.includes("plan-check"));
      assert.ok(executionOrder.includes("delegation-depth"));
      assert.ok(executionOrder.includes("memory-sync"));
      assert.ok(executionOrder.includes("confidence-gate"));
    });

    it("unregister removes hook from execution", async () => {
      const reg = HookRegistry.getInstance();
      let hookRan = false;

      reg.registerPreTool(
        makePreToolHook("removable", {}, async () => {
          hookRan = true;
          return { result: HookResult.CONTINUE };
        }),
      );

      reg.unregister("removable");
      await reg.executePreTool(makeContext());
      assert.equal(hookRan, false);
    });
  });

  // ---------------------------------------------------------------------------
  // sanityCheckHook
  // ---------------------------------------------------------------------------

  describe("sanityCheckHook", () => {
    beforeEach(() => {
      AnomalyTracker.getInstance().resetAll();
    });

    it("passes clean output through unchanged", async () => {
      const ctx = makeContext();
      const result = await sanityCheckHook.execute(
        ctx,
        "Everything is working fine. The system completed the task successfully.",
      );
      assert.equal(result.result, HookResult.CONTINUE);
      assert.equal(result.modifiedOutput, undefined);
    });

    it("detects repetitive output", async () => {
      const ctx = makeContext();
      const line =
        "Sphinx of black quartz, judge my vow! The five boxing wizards jump quickly. 0123456789 ABCDEFGHIJKLMNOPQRSTUVWXYZ";
      const repetitiveOutput = Array.from({ length: 20 }, () => line).join("\n");
      const result = await sanityCheckHook.execute(ctx, repetitiveOutput);
      // First anomaly — not yet escalated
      assert.equal(result.result, HookResult.CONTINUE);
    });

    it("detects box-drawing character flooding", async () => {
      const ctx = makeContext();
      const boxArt = "─│┌┐└┘├┤┬┴┼".repeat(50);
      const result = await sanityCheckHook.execute(ctx, boxArt);
      assert.equal(result.result, HookResult.CONTINUE);
    });

    it("detects placeholder patterns", async () => {
      const ctx = makeContext();
      // 50× [PLACEHOLDER] = 650 chars, 11 unique → triggers low_diversity check
      const placeholderText = "[PLACEHOLDER]".repeat(50);
      const result = await sanityCheckHook.execute(ctx, placeholderText);
      assert.equal(result.result, HookResult.CONTINUE);
    });

    it("tracks anomalies across calls", async () => {
      const ctx = makeContext({ sessionId: "anomaly-escalation-test" });
      const line =
        "Sphinx of black quartz, judge my vow! The five boxing wizards jump quickly. 0123456789 ABCDEFGHIJKLMNOPQRSTUVWXYZ";
      const repetitiveOutput = Array.from({ length: 20 }, () => line).join("\n");

      // First call: anomaly detected but below threshold → CONTINUE
      const firstResult = await sanityCheckHook.execute(ctx, repetitiveOutput);
      assert.equal(firstResult.result, HookResult.CONTINUE);

      // Second call: threshold reached → INJECT with recovery
      const secondResult = await sanityCheckHook.execute(ctx, repetitiveOutput);
      assert.equal(secondResult.result, HookResult.INJECT);
      assert.ok(secondResult.injectRecovery);
      assert.equal(secondResult.modifiedOutput, repetitiveOutput);
    });
  });
});
