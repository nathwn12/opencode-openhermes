// ---------------------------------------------------------------------------
// PlanCheckHook — PreToolUse, priority=90, phase=EARLY
//
// Before any sub-agent call, verify plan file exists at the expected path.
// If missing, inject "create plan first" instruction.
// ---------------------------------------------------------------------------

import { HookPhase, HookResult } from "../types.ts";
import type { HookContext, PreToolUseHook } from "../types.ts";
import { findLatestPlanFile } from "../../../../bootstrap.ts";

export const planCheckHook: PreToolUseHook = {
  metadata: {
    name: "plan-check",
    priority: 90,
    phase: HookPhase.EARLY,
    dependencies: [],
    errorHandling: "propagate",
  },

  async execute(context: HookContext) {
    const planFile = findLatestPlanFile(context.directory);

    if (!planFile) {
      return {
        result: HookResult.INJECT,
        modifiedContext: {
          _planCheck: "missing",
          _planCheckInstruction:
            "No plan file found. Create a plan first before proceeding with any sub-agent tasks.",
        },
      };
    }

    return {
      result: HookResult.CONTINUE,
      modifiedContext: {
        _planCheck: "found",
        _planFilePath: planFile,
      },
    };
  },
};
