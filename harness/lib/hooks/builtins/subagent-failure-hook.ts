// ---------------------------------------------------------------------------
// SubagentFailureHook — PostToolUse, priority=45, phase=LATE
//
// Mechanically tracks subagent task failures.
// At maxSubagentFailures consecutive failures on the same task,
// surfaces a BLOCKER.
// ---------------------------------------------------------------------------

import { HookPhase, HookResult } from "../types.ts";
import type { HookContext, PostToolUseHook } from "../types.ts";
import { DEFAULT_GUARD_CONFIG, checkGuardProgression } from "../../guards/guard-config.ts";
import type { GuardConfig } from "../../guards/guard-config.ts";

/** Module-level failure tracker — maps sessionId to consecutive failure count */
const failureCounters = new Map<string, number>();

export function resetSubagentFailures(sessionId?: string): void {
  if (sessionId) {
    failureCounters.delete(sessionId);
  } else {
    failureCounters.clear();
  }
}

export function getSubagentFailureCount(sessionId: string): number {
  return failureCounters.get(sessionId) ?? 0;
}

// Error pattern detection — reuses the same patterns from error-recovery-hook
function outputLooksLikeFailure(output: string): boolean {
  if (!output || output.length === 0) return true; // Empty output = failure
  const errorPatterns = [
    /error/i, /exception/i, /failed/i, /failure/i,
    /unable to/i, /could not/i, /not found/i,
    /ECONNREFUSED/i, /ETIMEDOUT/i, /rate.?limited/i,
    /too many requests/i, /timeout/i, /execution.?timed.?out/i,
  ];
  const head = output.slice(0, 2000);
  return errorPatterns.some((p) => p.test(head));
}

export const subagentFailureHook: PostToolUseHook = {
  metadata: {
    name: "subagent-failure",
    priority: 45,
    phase: HookPhase.LATE,
    dependencies: [],
    errorHandling: "isolate",
  },

  async execute(context: HookContext, output: string) {
    const sessionId = context.sessionId;
    const config: GuardConfig = context._guardConfig ?? DEFAULT_GUARD_CONFIG;
    const maxFailures = config.maxSubagentFailures;

    if (maxFailures <= 0) {
      // Disabled
      return { result: HookResult.CONTINUE };
    }

    const isFailure = outputLooksLikeFailure(output);
    let currentCount = failureCounters.get(sessionId) ?? 0;

    if (isFailure) {
      currentCount += 1;
      failureCounters.set(sessionId, currentCount);
    } else {
      // Success — reset counter
      failureCounters.set(sessionId, 0);
      return { result: HookResult.CONTINUE };
    }

    // Check progression
    const progression = checkGuardProgression(currentCount, maxFailures, config);

    if (progression.level === "stop") {
      // Surface BLOCKER
      return {
        result: HookResult.INJECT,
        modifiedOutput: output,
        injectRecovery: `[HOOK: BLOCKER] ${currentCount} consecutive subagent failures (max ${maxFailures}). Surface to orchestrator with findings and stop delegating.`,
      };
    }

    if (progression.level === "warn" || progression.level === "escalate") {
      // Annotate but don't stop
      context._guardProgression = progression;
      context._subagentFailures = currentCount;
    }

    return { result: HookResult.CONTINUE };
  },
};
