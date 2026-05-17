// Auto-Recovery type definitions for sub-agent error handling.

export type ErrorCategory =
  | "rate_limit"
  | "context_overflow"
  | "network"
  | "session"
  | "tool_error"
  | "parse_error"
  | "gibberish"
  | "lsp_diagnostic"
  | "timeout";

export type RecoveryActionType =
  | "retry"
  | "abort"
  | "skip"
  | "escalate"
  | "compact";

export interface RecoveryAction {
  type: RecoveryActionType;
  delay?: number; // ms delay before retry
  maxAttempts?: number; // max retry attempts
  reason: string;
  modifyPrompt?: string; // instruction to prepend to retry prompt
}

export interface ErrorContext {
  sessionId: string;
  error: Error;
  attempt: number;
  timestamp: number;
  agent?: string;
}

export interface RecoveryRecord {
  context: ErrorContext;
  action: RecoveryAction;
  timestamp: number;
}

export interface RecoveryStats {
  totalRecoveries: number;
  byCategory: Record<ErrorCategory, number>;
  byAction: Record<RecoveryActionType, number>;
  successRate: number;
}
