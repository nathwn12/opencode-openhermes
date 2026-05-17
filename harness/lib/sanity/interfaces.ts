// ---------------------------------------------------------------------------
// Sanity Checker — type definitions
// ---------------------------------------------------------------------------

export type Severity = "ok" | "warning" | "critical";

export interface SanityResult {
  isHealthy: boolean;
  severity: Severity;
  reason?: string;
  patternName?: string;
}

export interface AnomalyRecord {
  sessionId: string;
  count: number;
  lastReason: string;
  lastTimestamp: number;
}

export interface AnomalyTrackerConfig {
  maxConsecutiveAnomalies: number; // default 2
  escalationMessage: string;       // default "recovery: compact context"
}
