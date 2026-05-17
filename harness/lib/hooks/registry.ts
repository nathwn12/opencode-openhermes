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
  private static instance: HookRegistry;

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
    HookRegistry.instance = null as unknown as HookRegistry;
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
  ): Promise<{ result: HookResult; modifiedContext?: Partial<HookContext> }> {
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
    recovery?: string;
  }> {
    const sorted = this.topologicalSort(this.postToolHooks);
    let currentOutput = output;
    let recovery: string | undefined;
    let hasInjection = false;

    for (const hook of sorted) {
      const result = await hook.execute(context, currentOutput);
      if (result.modifiedOutput !== undefined) {
        currentOutput = result.modifiedOutput;
      }
      if (result.injectRecovery !== undefined) {
        recovery = result.injectRecovery;
      }
      if (result.result === HookResult.STOP) {
        return {
          result: HookResult.STOP,
          modifiedOutput: currentOutput,
          recovery,
        };
      }
      if (result.result === HookResult.INJECT) {
        hasInjection = true;
      }
    }

    return {
      result: hasInjection ? HookResult.INJECT : HookResult.CONTINUE,
      modifiedOutput: currentOutput,
      recovery,
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
  // Topological Sort
  // -----------------------------------------------------------------------

  /**
   * Topological sort using Kahn's algorithm.
   *
   * Ordering rules:
   *  1. Group by phase: EARLY → NORMAL → LATE
   *  2. Within same phase, sort by priority DESC
   *  3. Within same priority, topological dependency order
   *
   * Cycle detection: throws Error("Circular dependency detected: ...")
   * Handles diamond dependencies correctly.
   */
  topologicalSort<T extends { metadata: HookMetadata }>(hooks: T[]): T[] {
    if (hooks.length === 0) return [];

    // Build name-to-hook map for lookup
    const nameToHook = new Map<string, T>();
    for (const hook of hooks) {
      nameToHook.set(hook.metadata.name, hook);
    }

    // Separate hooks by phase, keeping only those in the input set
    const phaseGroups = new Map<HookPhase, T[]>();
    for (const hook of hooks) {
      const phase = hook.metadata.phase;
      if (!phaseGroups.has(phase)) phaseGroups.set(phase, []);
      phaseGroups.get(phase)!.push(hook);
    }

    const result: T[] = [];

    // Process phases in order: EARLY, NORMAL, LATE
    for (const phase of [HookPhase.EARLY, HookPhase.NORMAL, HookPhase.LATE]) {
      const phaseHooks = phaseGroups.get(phase);
      if (!phaseHooks || phaseHooks.length === 0) continue;

      // Topologically sort within this phase
      const sorted = this.kahnSort(phaseHooks, nameToHook);
      result.push(...sorted);
    }

    return result;
  }

  /**
   * Kahn's algorithm for topological sorting within a phase group.
   * Dependencies are only considered within the hooks passed in.
   */
  private kahnSort<T extends { metadata: HookMetadata }>(
    hooks: T[],
    _allHooks: Map<string, T>,
  ): T[] {
    const nameToHook = new Map<string, T>();
    for (const hook of hooks) {
      nameToHook.set(hook.metadata.name, hook);
    }

    // Build adjacency list and in-degree map
    const inDegree = new Map<string, number>();
    const adj = new Map<string, string[]>();

    for (const hook of hooks) {
      const name = hook.metadata.name;
      if (!inDegree.has(name)) inDegree.set(name, 0);
      if (!adj.has(name)) adj.set(name, []);

      for (const dep of hook.metadata.dependencies) {
        // Only consider dependencies within this phase group
        if (!nameToHook.has(dep)) continue;

        if (!adj.has(dep)) adj.set(dep, []);
        adj.get(dep)!.push(name);
        inDegree.set(name, (inDegree.get(name) ?? 0) + 1);
      }
    }

    // Seed queue with zero in-degree nodes, sorted by priority DESC for determinism
    const queue: string[] = [];
    for (const [name, degree] of inDegree) {
      if (degree === 0) queue.push(name);
    }

    const sorted: T[] = [];

    while (queue.length > 0) {
      // Sort by priority DESC for deterministic output
      queue.sort((a, b) => {
        const pa = nameToHook.get(a)?.metadata.priority ?? 0;
        const pb = nameToHook.get(b)?.metadata.priority ?? 0;
        if (pb !== pa) return pb - pa;
        // Tie-break by name for stability
        return a.localeCompare(b);
      });

      const name = queue.shift()!;
      const hook = nameToHook.get(name)!;
      sorted.push(hook);

      for (const neighbor of adj.get(name) ?? []) {
        const currentDegree = inDegree.get(neighbor) ?? 1;
        const newDegree = currentDegree - 1;
        inDegree.set(neighbor, newDegree);
        if (newDegree === 0) {
          queue.push(neighbor);
        }
      }
    }

    // Cycle detection
    if (sorted.length !== hooks.length) {
      const sortedNames = new Set(sorted.map((h) => h.metadata.name));
      const unsorted = hooks
        .filter((h) => !sortedNames.has(h.metadata.name))
        .map((h) => h.metadata.name);
      throw new Error(
        `Circular dependency detected: ${unsorted.join(" → ")}`,
      );
    }

    return sorted;
  }
}
