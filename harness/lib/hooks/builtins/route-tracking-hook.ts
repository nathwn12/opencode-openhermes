// ---------------------------------------------------------------------------
// RouteTrackingHook — RouteHook, priority=55, phase=LATE
//
// Loop guard — mechanically enforce two limits:
// 1. Same skill visited 5+ times in one chain
// 2. 8+ consecutive unproductive hops
// ---------------------------------------------------------------------------

import { HookPhase, HookResult } from "../types.ts";
import type { HookContext, RouteHook } from "../types.ts";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface HopRecord {
  skill: string;
  timestamp: number;
  producedArtifact: boolean;
}

export interface RouteTrackingConfig {
  maxSkillRepeats: number;
  maxUnproductiveHops: number;
  artifactCheck: (route: string) => boolean | Promise<boolean>;
}

interface RouteTrackingState {
  hops: HopRecord[];
  skillCounts: Map<string, number>;
  unproductiveCount: number;
}

// ---------------------------------------------------------------------------
// Module-level state
// ---------------------------------------------------------------------------

const sessionStates = new Map<string, RouteTrackingState>();

export function resetRouteTracker(sessionId?: string): void {
  if (sessionId) {
    sessionStates.delete(sessionId);
  } else {
    sessionStates.clear();
  }
}

export function getHopHistory(sessionId: string): HopRecord[] {
  return sessionStates.get(sessionId)?.hops ?? [];
}

// ---------------------------------------------------------------------------
// Default artifact check (conservative — assumes unproductive)
// ---------------------------------------------------------------------------

const defaultArtifactCheck: (route: string) => boolean = () => false;

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export const routeTrackingHook: RouteHook = {
  metadata: {
    name: "route-tracking",
    priority: 55,
    phase: HookPhase.LATE,
    dependencies: [],
    errorHandling: "propagate",
  },

  async execute(context: HookContext, route: string) {
    // Skip terminal routes — they don't count as routing hops
    const terminalRoutes = new Set(["surface", "done", "oh-handoff"]);
    if (terminalRoutes.has(route)) {
      return { result: HookResult.CONTINUE, modifiedRoute: route };
    }

    const sessionId = context.sessionId;

    // Get or create state for this session
    let state = sessionStates.get(sessionId);
    if (!state) {
      state = {
        hops: [],
        skillCounts: new Map<string, number>(),
        unproductiveCount: 0,
      };
      sessionStates.set(sessionId, state);
    }

    // Read config from context (or use defaults)
    // Support both `_routeTrackingConfig` and `hooks.route_tracking.*` conventions
    const config: Partial<RouteTrackingConfig> = context._routeTrackingConfig ?? {};
    const maxSkillRepeats = config.maxSkillRepeats ?? 5;
    const maxUnproductiveHops = config.maxUnproductiveHops ?? 8;
    const artifactCheck = config.artifactCheck ?? defaultArtifactCheck;

    // Record the hop
    const producedArtifact = await artifactCheck(route);
    const hop: HopRecord = {
      skill: route,
      timestamp: Date.now(),
      producedArtifact,
    };
    state.hops.push(hop);

    // Update skill count
    const currentSkillCount = (state.skillCounts.get(route) ?? 0) + 1;
    state.skillCounts.set(route, currentSkillCount);

    // Update unproductive counter (resets on any productive hop)
    if (producedArtifact) {
      state.unproductiveCount = 0;
    } else {
      state.unproductiveCount += 1;
    }

    // Check 1: Same skill repeated too many times
    if (currentSkillCount >= maxSkillRepeats) {
      context._optiRoute = {
        reason: `Same skill "${route}" visited ${currentSkillCount} times (max ${maxSkillRepeats})`,
        chain: [...state.hops],
        skillCounts: Object.fromEntries(state.skillCounts),
        unproductiveCount: state.unproductiveCount,
        maxSkillRepeats,
        maxUnproductiveHops,
      };
      return { result: HookResult.STOP };
    }

    // Check 2: Too many consecutive unproductive hops
    if (state.unproductiveCount >= maxUnproductiveHops) {
      context._optiRoute = {
        reason: `${state.unproductiveCount} consecutive unproductive hops (max ${maxUnproductiveHops})`,
        chain: [...state.hops],
        skillCounts: Object.fromEntries(state.skillCounts),
        unproductiveCount: state.unproductiveCount,
        maxSkillRepeats,
        maxUnproductiveHops,
      };
      return { result: HookResult.STOP };
    }

    return { result: HookResult.CONTINUE, modifiedRoute: route };
  },
};
