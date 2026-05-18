// ---------------------------------------------------------------------------
// HookRegistry — singleton pluggable hook system with topological sort
// ---------------------------------------------------------------------------

import type {
  HookContext,
  HookMetadata,
  PreToolUseHook,
  PostToolUseHook,
  RouteHook,
  SessionHook,
  AnyHook,
} from "./types.ts";
import { HookPhase, HookResult } from "./types.ts";

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------

export class HookRegistry {
  private static instance: HookRegistry | null = null;

  private preToolHooks: PreToolUseHook[] = [];
  private postToolHooks: PostToolUseHook[] = [];
  private routeHooks: RouteHook[] = [];
  private sessionHooks: SessionHook[] = [];

  private constructor() {}

  /** Get the singleton instance. */
  static getInstance(): HookRegistry {
    if (!HookRegistry.instance) {
      HookRegistry.instance = new HookRegistry();
    }
    return HookRegistry.instance;
  }

  /** Reset singleton — used in tests for isolation. */
  static resetInstance(): void {
    HookRegistry.instance = null;
  }

  // -----------------------------------------------------------------------
  // Registration
  // -----------------------------------------------------------------------

  registerPreTool(hook: PreToolUseHook): boolean {
    if (!this.assertNoNameConflict(hook.metadata.name, this.preToolHooks)) {
      return false; // already registered, skip silently
    }
    this.preToolHooks.push(hook);
    return true;
  }

  registerPostTool(hook: PostToolUseHook): boolean {
    if (!this.assertNoNameConflict(hook.metadata.name, this.postToolHooks)) {
      return false;
    }
    this.postToolHooks.push(hook);
    return true;
  }

  registerRoute(hook: RouteHook): boolean {
    if (!this.assertNoNameConflict(hook.metadata.name, this.routeHooks)) {
      return false;
    }
    this.routeHooks.push(hook);
    return true;
  }

  registerSession(hook: SessionHook): boolean {
    if (!this.assertNoNameConflict(hook.metadata.name, this.sessionHooks)) {
      return false;
    }
    this.sessionHooks.push(hook);
    return true;
  }

  /**
   * Unregister a hook by name from ALL categories.
   * Returns true if found and removed, false if not found.
   */
  unregister(name: string): boolean {
    let removed = false;

    const preIdx = this.preToolHooks.findIndex((h) => h.metadata.name === name);
    if (preIdx >= 0) {
      this.preToolHooks.splice(preIdx, 1);
      removed = true;
    }

    const postIdx = this.postToolHooks.findIndex(
      (h) => h.metadata.name === name,
    );
    if (postIdx >= 0) {
      this.postToolHooks.splice(postIdx, 1);
      removed = true;
    }

    const routeIdx = this.routeHooks.findIndex(
      (h) => h.metadata.name === name,
    );
    if (routeIdx >= 0) {
      this.routeHooks.splice(routeIdx, 1);
      removed = true;
    }

    const sessIdx = this.sessionHooks.findIndex(
      (h) => h.metadata.name === name,
    );
    if (sessIdx >= 0) {
      this.sessionHooks.splice(sessIdx, 1);
      removed = true;
    }

    return removed;
  }

  /**
   * Check if a hook with the given name is already registered in the target list.
   * Returns true if the name is available (no conflict), false if already registered.
   * Does NOT throw — silently skips duplicates to support multiple bootstrap calls.
   */
  private assertNoNameConflict(
    name: string,
    list: { metadata: HookMetadata }[],
  ): boolean {
    return !list.some((h) => h.metadata.name === name);
  }

  // -----------------------------------------------------------------------
  // Execution
  // -----------------------------------------------------------------------

  /**
   * Execute all PreToolUse hooks in sorted order.
   * Stops execution only on STOP. INJECT signals context modification
   * but does not short-circuit subsequent hooks.
   */
  async executePreTool(
    context: HookContext,
  ): Promise<{ result: HookResult; modifiedContext?: HookContext }> {
    const sorted = this.topologicalSort(this.preToolHooks);
    let currentContext = context;
    let hasInjection = false;

    for (const hook of sorted) {
      const result = await hook.execute(currentContext);
      if (result.modifiedContext) {
        currentContext = { ...currentContext, ...result.modifiedContext };
      }
      if (result.result === HookResult.STOP) {
        return { result: HookResult.STOP, modifiedContext: currentContext };
      }
      if (result.result === HookResult.INJECT) {
        hasInjection = true;
      }
    }

    return {
      result: hasInjection ? HookResult.INJECT : HookResult.CONTINUE,
      modifiedContext: currentContext,
    };
  }

  /**
   * Execute all PostToolUse hooks in sorted order.
   * Accumulates output modifications across hooks.
   * INJECT does not short-circuit — all hooks run and the result is aggregated.
   */
  async executePostTool(
    context: HookContext,
    output: string,
  ): Promise<{
    result: HookResult;
    modifiedOutput?: string;
  }> {
    const sorted = this.topologicalSort(this.postToolHooks);
    let currentOutput = output;
    let hasInjection = false;

    for (const hook of sorted) {
      const result = await hook.execute(context, currentOutput);
      if (result.modifiedOutput !== undefined) {
        currentOutput = result.modifiedOutput;
      }
      if (result.result === HookResult.STOP) {
        return {
          result: HookResult.STOP,
          modifiedOutput: currentOutput,
        };
      }
      if (result.result === HookResult.INJECT) {
        hasInjection = true;
      }
    }

    return {
      result: hasInjection ? HookResult.INJECT : HookResult.CONTINUE,
      modifiedOutput: currentOutput,
    };
  }

  /**
   * Execute all Route hooks in sorted order.
   * Each hook can modify the route destination.
   * INJECT does not short-circuit — all hooks run and the result is aggregated.
   */
  async executeRoute(
    context: HookContext,
    route: string,
  ): Promise<{ result: HookResult; modifiedRoute?: string }> {
    const sorted = this.topologicalSort(this.routeHooks);
    let currentRoute = route;
    let hasInjection = false;

    for (const hook of sorted) {
      const result = await hook.execute(context, currentRoute);
      if (result.modifiedRoute !== undefined) {
        currentRoute = result.modifiedRoute;
      }
      if (result.result === HookResult.STOP) {
        return { result: HookResult.STOP, modifiedRoute: currentRoute };
      }
      if (result.result === HookResult.INJECT) {
        hasInjection = true;
      }
    }

    return {
      result: hasInjection ? HookResult.INJECT : HookResult.CONTINUE,
      modifiedRoute: currentRoute,
    };
  }

  /**
   * Execute onSessionStart for all Session hooks in sorted order.
   */
  async executeSessionStart(context: HookContext): Promise<void> {
    const sorted = this.topologicalSort(this.sessionHooks);
    for (const hook of sorted) {
      await hook.onSessionStart(context);
    }
  }

  /**
   * Execute onSessionEnd for all Session hooks in sorted order.
   */
  async executeSessionEnd(context: HookContext): Promise<void> {
    const sorted = this.topologicalSort(this.sessionHooks);
    for (const hook of sorted) {
      await hook.onSessionEnd(context);
    }
  }

  // -----------------------------------------------------------------------
  // Accessors (for testing)
  // -----------------------------------------------------------------------

  getPreToolHooks(): PreToolUseHook[] {
    return [...this.preToolHooks];
  }

  getPostToolHooks(): PostToolUseHook[] {
    return [...this.postToolHooks];
  }

  getRouteHooks(): RouteHook[] {
    return [...this.routeHooks];
  }

  getSessionHooks(): SessionHook[] {
    return [...this.sessionHooks];
  }

  getHookByName(name: string): AnyHook | undefined {
    return (
      this.preToolHooks.find((h) => h.metadata.name === name) ??
      this.postToolHooks.find((h) => h.metadata.name === name) ??
      this.routeHooks.find((h) => h.metadata.name === name) ??
      this.sessionHooks.find((h) => h.metadata.name === name)
    );
  }

  // -----------------------------------------------------------------------
  // Priority Sort
  // -----------------------------------------------------------------------

  /**
   * Sort hooks by phase order (EARLY → NORMAL → LATE), then priority DESC.
   * Dependencies are ignored — all current built-in hooks declare no dependencies,
   * so the simpler sort is sufficient and the Kahn complexity is unnecessary.
   */
  topologicalSort<T extends { metadata: HookMetadata }>(hooks: T[]): T[] {
    if (hooks.length === 0) return [];

    const phaseOrder: Record<string, number> = {
      [HookPhase.EARLY]: 0,
      [HookPhase.NORMAL]: 1,
      [HookPhase.LATE]: 2,
    };

    return [...hooks].sort((a, b) => {
      const phaseDiff = (phaseOrder[a.metadata.phase] ?? 1) - (phaseOrder[b.metadata.phase] ?? 1);
      if (phaseDiff !== 0) return phaseDiff;
      return (b.metadata.priority ?? 0) - (a.metadata.priority ?? 0);
    });
  }
}
