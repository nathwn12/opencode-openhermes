// ---------------------------------------------------------------------------
// DelegationDepthHook — PreToolUse, priority=60, phase=NORMAL
//
// Loop guard — track sub-agent call depth.
// If depth exceeds max, STOP and escalate.
// Progressive warning at thresholds before hard stop.
//
// Reads maxDelegationDepth from _guardConfig (centralized) with fallback
// to _maxDelegationDepth for backward compatibility.
// ---------------------------------------------------------------------------

import { HookPhase, HookResult } from "../types.ts";
import type { HookContext, PreToolUseHook } from "../types.ts";
import type { GuardConfig } from "../../guards/guard-config.ts";
import { checkGuardProgression, DEFAULT_GUARD_CONFIG } from "../../guards/guard-config.ts";

/** Module-level depth tracker — maps sessionId to current depth */
const depthTrackers = new Map<string, number>();

export function resetDepthTracker(): void {
  depthTrackers.clear();
}

export function getDepth(sessionId: string): number {
  return depthTrackers.get(sessionId) ?? 0;
}

export const delegationDepthHook: PreToolUseHook = {
  metadata: {
    name: "delegation-depth",
    priority: 60,
    phase: HookPhase.NORMAL,
    dependencies: [],
    errorHandling: "propagate",
  },

  async execute(context: HookContext) {
    const sessionId = context.sessionId;

    // Bump depth
    const currentDepth = (depthTrackers.get(sessionId) ?? 0) + 1;
    depthTrackers.set(sessionId, currentDepth);

    // Resolve guard config for progression checks
    const guardConfig: GuardConfig = context._guardConfig ?? DEFAULT_GUARD_CONFIG;

    // Backward compat: if legacy _maxDelegationDepth is set, use it
    // Otherwise use _guardConfig (centralized) with defaults
    const legacyDepth = (context as any)._maxDelegationDepth as number | undefined;
    const maxDepth = legacyDepth !== undefined ? legacyDepth : guardConfig.maxDelegationDepth;

    // Progressive warning check
    const progression = checkGuardProgression(currentDepth, maxDepth, guardConfig);

    if (progression.level === "warn" || progression.level === "escalate") {
      // Annotate context for the orchestrator but don't stop
      context._guardProgression = progression;
    }

    if (progression.level === "stop") {
      return {
        result: HookResult.STOP,
        modifiedContext: {
          _depthExceeded: true,
          _depthError: `LOOP GUARD: Delegation depth exceeded (max ${maxDepth}). Surface to orchestrator with findings and stop delegating.`,
          _delegationDepth: currentDepth,
        },
      };
    }

    return {
      result: HookResult.CONTINUE,
      modifiedContext: {
        _delegationDepth: currentDepth,
      },
    };
  },
};
