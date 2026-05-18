// ---------------------------------------------------------------------------
// ConfidenceGateHook — RouteHook, priority=70, phase=NORMAL
//
// Before routing, check if confidence gate needs to pause.
// Adjust route based on confidence level.
// ---------------------------------------------------------------------------

import { HookPhase, HookResult } from "../types.ts";
import type { HookContext, RouteHook } from "../types.ts";

export interface ConfidenceGateState {
  level: "HIGH" | "MEDIUM" | "LOW";
  exchanges: number;
  lastAction: string;
}

export const confidenceGateHook: RouteHook = {
  metadata: {
    name: "confidence-gate",
    priority: 70,
    phase: HookPhase.NORMAL,
    dependencies: [],
    errorHandling: "isolate",
  },

  async execute(context: HookContext, route: string) {
    // Read confidence state from context if available
    const confidenceLevel = context._confidenceLevel;

    if (!confidenceLevel) {
      // No confidence gate info — pass through unchanged
      return { result: HookResult.CONTINUE, modifiedRoute: route };
    }

    // Store the confidence assessment for routing decisions
    const state: ConfidenceGateState = {
      level: confidenceLevel as ConfidenceGateState["level"],
      exchanges: context._confidenceExchanges ?? 0,
      lastAction: "assessed",
    };

    // HIGH confidence: proceed without modification
    if (state.level === "HIGH") {
      return {
        result: HookResult.CONTINUE,
        modifiedRoute: route,
      };
    }

    // MEDIUM confidence: echo if first pass, otherwise proceed
    if (state.level === "MEDIUM" && state.exchanges === 0) {
      return {
        result: HookResult.INJECT,
        modifiedRoute: `${route}?echo=confirm`,
      };
    }

    // LOW confidence: pause if first pass, otherwise proceed
    if (state.level === "LOW" && state.exchanges === 0) {
      return {
        result: HookResult.INJECT,
        modifiedRoute: `${route}?question=pause`,
      };
    }

    return { result: HookResult.CONTINUE, modifiedRoute: route };
  },
};
