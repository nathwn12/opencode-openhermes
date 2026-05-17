// RecoveryHandler — singleton that classifies errors against patterns,
// applies recovery actions, and tracks stats.

import type {
  ErrorCategory,
  ErrorContext,
  RecoveryAction,
  RecoveryActionType,
  RecoveryRecord,
  RecoveryStats,
} from "./interfaces.ts";
import { PATTERNS, escalateAction } from "./patterns.ts";

/**
 * Represents the number of times we have *attempted recovery* for a
 * given (sessionId, category) pair. Separate from the sub-agent's own
 * attempt counter which is passed in ErrorContext.attempt.
 */
interface CategoryAttemptState {
  count: number;
}

export class RecoveryHandler {
  private static instance: RecoveryHandler;

  /** All recovery records keyed by sessionId then timestamp. */
  private history: RecoveryRecord[] = [];

  /** Track attempts per (sessionId + category) to enforce maxAttempts. */
  private attemptTracker = new Map<string, CategoryAttemptState>();

  /** Total number of recoveries that succeeded (fn completed without throwing). */
  private successCount = 0;
  private failureCount = 0;

  private constructor() {}

  /** Get the singleton instance. */
  static getInstance(): RecoveryHandler {
    if (!RecoveryHandler.instance) {
      RecoveryHandler.instance = new RecoveryHandler();
    }
    return RecoveryHandler.instance;
  }

  /**
   * Classify an error and return the appropriate recovery action.
   * Returns the first matching pattern's action, or escalates if no match.
   */
  handleError(context: ErrorContext): RecoveryAction {
    const message = context.error.message ?? String(context.error);

    for (const entry of PATTERNS) {
      if (entry.pattern.test(message)) {
        const action = entry.getAction(context);
        this.record(context, action);
        return action;
      }
    }

    // No pattern matched — escalate
    const action = escalateAction(context);
    this.record(context, action);
    return action;
  }

  /**
   * Wraps an async function with auto-recovery.
   *
   * On each throw:
   *  1. Classify the error via handleError()
   *  2. If action is "abort" | "escalate" | "skip" — rethrow immediately
   *  3. If action is "compact" | "retry" — check maxAttempts, delay, retry
   *
   * If the function succeeds, increments successCount.
   */
  async withRecovery<T>(
    sessionId: string,
    fn: () => Promise<T>,
    options?: { maxAttempts?: number },
  ): Promise<T> {
    const globalMax = options?.maxAttempts ?? 5;
    let attempt = 0;

    while (attempt < globalMax) {
      try {
        const result = await fn();
        this.successCount++;
        return result;
      } catch (err: unknown) {
        const error = err instanceof Error ? err : new Error(String(err));
        const context: ErrorContext = {
          sessionId,
          error,
          attempt,
          timestamp: Date.now(),
        };

        const action = this.handleError(context);

        // Non-recoverable actions — rethrow immediately
        if (action.type === "abort" || action.type === "escalate" || action.type === "skip") {
          this.failureCount++;
          throw error;
        }

        // Enforce category-specific maxAttempts
        if (action.maxAttempts !== undefined) {
          const category = this.findCategory(action.reason);
          const key = `${sessionId}::${category}`;
          const tracker = this.attemptTracker.get(key) ?? { count: 0 };
          tracker.count++;
          this.attemptTracker.set(key, tracker);

          if (tracker.count >= action.maxAttempts) {
            this.failureCount++;
            throw error;
          }
        }

        // Apply delay if specified
        if (action.delay && action.delay > 0) {
          await this.sleep(action.delay);
        }

        attempt++;
      }
    }

    this.failureCount++;
    // Exhausted global maxAttempts
    throw new Error(
      `[RecoveryHandler] Exhausted ${globalMax} attempts for session "${sessionId}"`,
    );
  }

  /** Convenience: sleep for ms. */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Derive a category from an action's reason string.
   * Falls back to "timeout" if no pattern matches.
   */
  private findCategory(reason: string): ErrorCategory {
    for (const entry of PATTERNS) {
      if (entry.pattern.test(reason)) {
        return entry.category;
      }
    }
    // Attempt to extract from the reason string heuristically
    const lower = reason.toLowerCase();
    if (lower.includes("rate")) return "rate_limit";
    if (lower.includes("context") || lower.includes("token")) return "context_overflow";
    if (lower.includes("network") || lower.includes("econnrefused")) return "network";
    if (lower.includes("session")) return "session";
    if (lower.includes("tool")) return "tool_error";
    if (lower.includes("parse") || lower.includes("json")) return "parse_error";
    if (lower.includes("gibberish")) return "gibberish";
    if (lower.includes("lsp") || lower.includes("tsc") || lower.includes("eslint")) {
      return "lsp_diagnostic";
    }
    if (lower.includes("timeout") || lower.includes("timed")) return "timeout";
    return "timeout";
  }

  /** Accumulated statistics. */
  getStats(): RecoveryStats {
    const byCategory: Record<ErrorCategory, number> = {
      rate_limit: 0,
      context_overflow: 0,
      network: 0,
      session: 0,
      tool_error: 0,
      parse_error: 0,
      gibberish: 0,
      lsp_diagnostic: 0,
      timeout: 0,
    };

    const byAction: Record<RecoveryActionType, number> = {
      retry: 0,
      abort: 0,
      skip: 0,
      escalate: 0,
      compact: 0,
    };

    for (const record of this.history) {
      const cat = this.findCategory(record.action.reason);
      if (byCategory[cat] !== undefined) byCategory[cat]++;
      if (byAction[record.action.type] !== undefined) byAction[record.action.type]++;
    }

    const totalRecoveries = this.history.length;
    const totalAttempts = this.successCount + this.failureCount;
    const successRate = totalAttempts > 0 ? this.successCount / totalAttempts : 0;

    return { totalRecoveries, byCategory, byAction, successRate };
  }

  /** Recent recovery records, most recent first. */
  getHistory(limit?: number): RecoveryRecord[] {
    const sorted = [...this.history].sort((a, b) => b.timestamp - a.timestamp);
    return limit ? sorted.slice(0, limit) : sorted;
  }

  /** Clear all records and attempt state for a given session. */
  clearSession(sessionId: string): void {
    this.history = this.history.filter((r) => r.context.sessionId !== sessionId);
    for (const key of this.attemptTracker.keys()) {
      if (key.startsWith(`${sessionId}::`)) {
        this.attemptTracker.delete(key);
      }
    }
  }

  /** Reset all state (useful in tests). */
  reset(): void {
    this.history = [];
    this.attemptTracker.clear();
    this.successCount = 0;
    this.failureCount = 0;
  }

  // ── private helpers ──

  private record(context: ErrorContext, action: RecoveryAction): void {
    // Update attempt tracker using the derived category from the action's reason
    const category = this.findCategory(action.reason);
    const key = `${context.sessionId}::${category}`;
    if (!this.attemptTracker.has(key)) {
      this.attemptTracker.set(key, { count: 0 });
    }

    this.history.push({
      context,
      action,
      timestamp: Date.now(),
    });
  }
}
