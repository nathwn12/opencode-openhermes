// Categorized error patterns with recovery action generators.
// Each pattern is a RegExp matched against error messages.
// The first match wins. If none match, the handler escalates.

import type { ErrorCategory, ErrorContext, RecoveryAction } from "./interfaces.ts";

export interface ErrorPattern {
  pattern: RegExp;
  category: ErrorCategory;
  getAction: (ctx: ErrorContext) => RecoveryAction;
}

/**
 * Default backoff delays (ms) for retries: [initial, second, third]
 */
const RATE_LIMIT_BACKOFF = [1_000, 2_000, 4_000] as const;
const NETWORK_BACKOFF = [500, 1_000, 2_000] as const;

export const PATTERNS: ErrorPattern[] = [
  // ── rate_limit ─────────────────────────────────────────────────────
  {
    pattern: /rate.?limit|too.?many.?requests|429/i,
    category: "rate_limit",
    getAction: (ctx: ErrorContext): RecoveryAction => {
      const delay = RATE_LIMIT_BACKOFF[Math.min(ctx.attempt, RATE_LIMIT_BACKOFF.length - 1)];
      return {
        type: "retry",
        delay,
        maxAttempts: 3,
        reason: `Rate limited (attempt ${ctx.attempt + 1}): backing off ${delay}ms`,
        modifyPrompt: undefined,
      };
    },
  },

  // ── context_overflow ──────────────────────────────────────────────
  {
    pattern: /context.?length|token.?limit|maximum.?context/i,
    category: "context_overflow",
    getAction: (): RecoveryAction => ({
      type: "compact",
      maxAttempts: 2,
      reason: "Context overflow detected: compacting before retry",
      modifyPrompt:
        "--- COMPACTED: Previous context exceeded token limits. Continue from here, preserving only essential state. ---",
    }),
  },

  // ── network ───────────────────────────────────────────────────────
  {
    pattern: /ECONNREFUSED|ETIMEDOUT|network|fetch.?failed/i,
    category: "network",
    getAction: (ctx: ErrorContext): RecoveryAction => {
      const delay = NETWORK_BACKOFF[Math.min(ctx.attempt, NETWORK_BACKOFF.length - 1)];
      return {
        type: "retry",
        delay,
        maxAttempts: 3,
        reason: `Network error (attempt ${ctx.attempt + 1}): retrying in ${delay}ms`,
      };
    },
  },

  // ── session ───────────────────────────────────────────────────────
  {
    pattern: /session.?not.?found|session.?expired/i,
    category: "session",
    getAction: (): RecoveryAction => ({
      type: "abort",
      reason: "Session not found or expired — cannot recover",
    }),
  },

  // ── tool_error ────────────────────────────────────────────────────
  {
    pattern: /tool.?not.?found|unknown.?tool/i,
    category: "tool_error",
    getAction: (): RecoveryAction => ({
      type: "escalate",
      reason: "Unknown or missing tool — orchestrator must decide",
    }),
  },

  // ── parse_error ───────────────────────────────────────────────────
  {
    pattern: /parse.?error|invalid.?json|syntax.?error/i,
    category: "parse_error",
    getAction: (ctx: ErrorContext): RecoveryAction => ({
      type: "retry",
      delay: 0,
      maxAttempts: 2,
      reason: `Parse error on attempt ${ctx.attempt + 1}: retrying without modification`,
    }),
  },

  // ── gibberish ─────────────────────────────────────────────────────
  // Broad heuristic on output quality — catches gibberish, keyboard mash,
  // repeated single characters, and long non-alphabetic sequences.
  {
    pattern: /gibberish|nonsens|unintelligible|asdfgh|qwerty|xxxxx|sdfsdf|[^a-z\s]{10,}|(.)\1{4,}/i,
    category: "gibberish",
    getAction: (): RecoveryAction => ({
      type: "retry",
      delay: 0,
      maxAttempts: 2,
      reason: "Gibberish output detected — retrying with clean context",
      modifyPrompt:
        "--- RECOVERY: Previous response was incoherent. Restart with only essential instructions. ---",
    }),
  },

  // ── lsp_diagnostic ────────────────────────────────────────────────
  {
    pattern: /lsp.?diagnostic|tsc.?error|eslint.?error/i,
    category: "lsp_diagnostic",
    getAction: (): RecoveryAction => ({
      type: "retry",
      delay: 0,
      maxAttempts: 2,
      reason: "LSP diagnostic error — retrying with diagnostics in context",
      modifyPrompt:
        "--- RECOVERY: The following LSP diagnostics were detected in the last attempt. Fix them before continuing. ---",
    }),
  },

  // ── timeout ───────────────────────────────────────────────────────
  {
    pattern: /execution.?timed.?out|timeout/i,
    category: "timeout",
    getAction: (): RecoveryAction => ({
      type: "retry",
      delay: 0,
      maxAttempts: 2,
      reason: "Execution timed out — retrying with task breakdown hint",
      modifyPrompt:
        "--- RECOVERY: Previous execution timed out. Break the task into smaller steps. ---",
    }),
  },
];

/**
 * Default escalation action when no pattern matches.
 */
export function escalateAction(ctx: ErrorContext): RecoveryAction {
  return {
    type: "escalate",
    reason: `Unrecognized error "${ctx.error.message}" — escalating to orchestrator`,
  };
}
