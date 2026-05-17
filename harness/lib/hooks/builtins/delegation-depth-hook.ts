// ---------------------------------------------------------------------------
// DelegationDepthHook — PreToolUse, priority=60, phase=NORMAL
//
// Loop guard — track sub-agent call depth.
// If depth > 5, STOP and escalate.
// ---------------------------------------------------------------------------

import { HookPhase, HookResult } from "../types.ts";
import type { HookContext, PreToolUseHook } from "../types.ts";

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

    // The configured limit (can be overridden via context)
    const maxDepth = (context._maxDelegationDepth as number) ?? 5;

    if (currentDepth >= maxDepth) {
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
