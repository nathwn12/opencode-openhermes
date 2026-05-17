// Auto-Recovery module — barrel export.

export type {
  ErrorCategory,
  RecoveryActionType,
  RecoveryAction,
  ErrorContext,
  RecoveryRecord,
  RecoveryStats,
} from "./interfaces.ts";

export { RecoveryHandler } from "./handler.ts";
export { PATTERNS, escalateAction } from "./patterns.ts";
export type { ErrorPattern } from "./patterns.ts";
