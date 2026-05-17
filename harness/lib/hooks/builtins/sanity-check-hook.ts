// ---------------------------------------------------------------------------
// SanityCheckHook — PostToolUse, priority=30, phase=LATE
//
// After each tool invocation, check the output for LLM degeneration patterns
// (repetition, low diversity, gibberish, etc.). Track consecutive anomalies
// per session. If 2+ consecutive anomalies detected, inject a recovery
// instruction to compact/refresh context before it cascades.
// ---------------------------------------------------------------------------

import { HookPhase, HookResult } from "../types.ts";
import type { HookContext, PostToolUseHook } from "../types.ts";
import { checkOutputSanity } from "../../sanity/checker.ts";
import { AnomalyTracker } from "../../sanity/anomaly-tracker.ts";

export const sanityCheckHook: PostToolUseHook = {
  metadata: {
    name: "sanity-check",
    priority: 30,
    phase: HookPhase.LATE,
    dependencies: [],
    errorHandling: "isolate",
  },

  async execute(context: HookContext, output: string) {
    const sessionId = context.sessionId;

    // Run the sanity checker on the output
    const result = checkOutputSanity(output);

    // Record the result in the anomaly tracker
    const tracker = AnomalyTracker.getInstance();
    const tracking = tracker.record(sessionId, result);

    if (result.isHealthy) {
      // Output is healthy — no action needed
      return { result: HookResult.CONTINUE };
    }

    // Unhealthy output detected
    if (tracking.shouldEscalate) {
      // Escalation threshold reached — inject recovery instruction
      return {
        result: HookResult.INJECT,
        modifiedOutput: output,
        injectRecovery: tracking.recoveryMessage ?? "recovery: compact context",
      };
    }

    // First anomaly (below threshold) — let it pass with a warning
    return { result: HookResult.CONTINUE };
  },
};
