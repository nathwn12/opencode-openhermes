// ---------------------------------------------------------------------------
// RouteTrackingHook — RouteHook, priority=55, phase=LATE
//
// Loop guard — mechanically enforce two limits:
// 1. Same skill visited N+ times in one chain (default 5)
// 2. N+ consecutive unproductive hops (default 8)
//
// Config from _guardConfig (centralized) with fallback to _routeTrackingConfig
// for backward compatibility. Progressive warning at thresholds before hard stop.
// ---------------------------------------------------------------------------

import { HookPhase, HookResult } from "../types.ts";
import type { HookContext, RouteHook } from "../types.ts";
import type { GuardConfig, GuardProgression } from "../../guards/guard-config.ts";
import { checkGuardProgression, DEFAULT_GUARD_CONFIG } from "../../guards/guard-config.ts";

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
// Resolve max values from guard config with fallbacks
// ---------------------------------------------------------------------------

function resolveMaxValues(context: HookContext): {
  maxSkillRepeats: number;
  maxUnproductiveHops: number;
  artifactCheck: (route: string) => boolean | Promise<boolean>;
} {
  // Primary: _guardConfig (centralized)
  const gc: GuardConfig = context._guardConfig ?? DEFAULT_GUARD_CONFIG;
  const maxSkillRepeats = gc.maxSkillRepeats;
  const maxUnproductiveHops = gc.maxUnproductiveHops;

  // Backward compat: _routeTrackingConfig overrides if present
  const legacy = context._routeTrackingConfig as Partial<RouteTrackingConfig> | undefined;
  const artifactCheck = legacy?.artifactCheck ?? defaultArtifactCheck;
  const legacySkillRepeats = legacy?.maxSkillRepeats;
  const legacyUnproductiveHops = legacy?.maxUnproductiveHops;

  return {
    maxSkillRepeats: legacySkillRepeats ?? maxSkillRepeats,
    maxUnproductiveHops: legacyUnproductiveHops ?? maxUnproductiveHops,
    artifactCheck,
  };
}

// ---------------------------------------------------------------------------
// Build optiRoute report helper
// ---------------------------------------------------------------------------

function buildOptiRouteReport(
  state: RouteTrackingState,
  reason: string,
  maxSkillRepeats: number,
  maxUnproductiveHops: number,
) {
  return {
    reason,
    chain: [...state.hops],
    skillCounts: Object.fromEntries(state.skillCounts),
    unproductiveCount: state.unproductiveCount,
    maxSkillRepeats,
    maxUnproductiveHops,
  };
}

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

    // Resolve config values
    const { maxSkillRepeats, maxUnproductiveHops, artifactCheck } = resolveMaxValues(context);
    const gc: GuardConfig = context._guardConfig ?? DEFAULT_GUARD_CONFIG;

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

    // Check 1: Same skill repeated too many times — with progressive warning
    let progression = checkGuardProgression(currentSkillCount, maxSkillRepeats, gc);
    if (progression.level === "warn" || progression.level === "escalate") {
      // Progressive warning — annotate context but don't stop
      context._guardProgression = progression;
    }
    if (progression.level === "stop") {
      context._optiRoute = buildOptiRouteReport(
        state,
        `Same skill "${route}" visited ${currentSkillCount} times (max ${maxSkillRepeats})`,
        maxSkillRepeats,
        maxUnproductiveHops,
      );
      return { result: HookResult.STOP };
    }

    // Check 2: Too many consecutive unproductive hops — with progressive warning
    progression = checkGuardProgression(state.unproductiveCount, maxUnproductiveHops, gc);
    if (progression.level === "warn" || progression.level === "escalate") {
      // Progressive warning — annotate context but don't stop
      context._guardProgression = progression;
    }
    if (progression.level === "stop") {
      context._optiRoute = buildOptiRouteReport(
        state,
        `${state.unproductiveCount} consecutive unproductive hops (max ${maxUnproductiveHops})`,
        maxSkillRepeats,
        maxUnproductiveHops,
      );
      return { result: HookResult.STOP };
    }

    return { result: HookResult.CONTINUE, modifiedRoute: route };
  },
};
