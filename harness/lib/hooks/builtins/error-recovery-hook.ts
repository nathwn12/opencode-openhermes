// ---------------------------------------------------------------------------
// ErrorRecoveryHook — PostToolUse, priority=50, phase=LATE
//
// After sub-agent call, check if output indicates error.
// Use the RecoveryHandler to match patterns and inject recovery actions.
// ---------------------------------------------------------------------------

import { HookPhase, HookResult } from "../types.ts";
import type { HookContext, PostToolUseHook } from "../types.ts";
import { RecoveryHandler } from "../../recovery/handler.ts";
import type { ErrorContext } from "../../recovery/interfaces.ts";

export const errorRecoveryHook: PostToolUseHook = {
  metadata: {
    name: "error-recovery",
    priority: 50,
    phase: HookPhase.LATE,
    dependencies: [],
    errorHandling: "isolate",
  },

  async execute(context: HookContext, output: string) {
    // Check if the output looks like an error
    const isErrorOutput = looksLikeError(output);
    if (!isErrorOutput) {
      return { result: HookResult.CONTINUE };
    }

    // Classify the error and get a recovery action
    const handler = RecoveryHandler.getInstance();
    const errorContext: ErrorContext = {
      sessionId: context.sessionId,
      error: new Error(output.slice(0, 500)), // Truncate for classification
      attempt: (context._recoveryAttempt as number) ?? 0,
      timestamp: Date.now(),
      agent: context.agent,
    };

    const action = handler.handleError(errorContext);

    // Build a recovery instruction based on the action
    const recoveryInstruction = buildRecoveryInstruction(action);

    return {
      result: HookResult.INJECT,
      modifiedOutput: output,
      injectRecovery: recoveryInstruction,
    };
  },
};

/**
 * Heuristic check: does the output look like an error?
 * Looks for common error patterns in tool output.
 */
function looksLikeError(output: string): boolean {
  if (!output || output.length === 0) return false;

  const errorPatterns = [
    /error/i,
    /exception/i,
    /failed/i,
    /failure/i,
    /unable to/i,
    /could not/i,
    /not found/i,
    /ECONNREFUSED/i,
    /ETIMEDOUT/i,
    /rate.?limited/i,
    /too many requests/i,
    /context.?length/i,
    /token.?limit/i,
    /parse.?error/i,
    /syntax.?error/i,
    /timeout/i,
    /execution.?timed.?out/i,
  ];

  // Check first 2000 chars to avoid false positives in long output
  const head = output.slice(0, 2000);
  return errorPatterns.some((p) => p.test(head));
}

/**
 * Build a recovery instruction string from a RecoveryAction.
 */
function buildRecoveryInstruction(
  action: { type: string; delay?: number; maxAttempts?: number; reason: string; modifyPrompt?: string },
): string {
  const parts: string[] = [
    `[HOOK: Error Recovery]`,
    `Action: ${action.type}`,
    `Reason: ${action.reason}`,
  ];

  if (action.delay) {
    parts.push(`Delay: ${action.delay}ms before retry`);
  }
  if (action.maxAttempts) {
    parts.push(`Max attempts: ${action.maxAttempts}`);
  }
  if (action.modifyPrompt) {
    parts.push(`Modification: ${action.modifyPrompt}`);
  }

  return parts.join("\n");
}
