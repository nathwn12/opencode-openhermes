// ---------------------------------------------------------------------------
// AnomalyTracker — singleton that tracks consecutive anomaly records per session
// ---------------------------------------------------------------------------

import type { AnomalyRecord, AnomalyTrackerConfig, SanityResult } from "./interfaces.ts";

const DEFAULT_CONFIG: AnomalyTrackerConfig = {
  maxConsecutiveAnomalies: 2,
  escalationMessage: "recovery: compact context",
};

export class AnomalyTracker {
  private static instance: AnomalyTracker;

  private records = new Map<string, AnomalyRecord>();
  private config: AnomalyTrackerConfig;

  private constructor(config?: Partial<AnomalyTrackerConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /** Get the singleton instance. */
  static getInstance(config?: Partial<AnomalyTrackerConfig>): AnomalyTracker {
    if (!AnomalyTracker.instance) {
      AnomalyTracker.instance = new AnomalyTracker(config);
    }
    return AnomalyTracker.instance;
  }

  /**
   * Record a sanity result for a session.
   * If unhealthy: increments consecutive count, updates reason/timestamp.
   * If healthy: resets consecutive count to 0.
   * Returns tracking info including whether escalation is needed.
   */
  record(
    sessionId: string,
    result: SanityResult,
  ): {
    shouldEscalate: boolean;
    consecutiveAnomalies: number;
    recoveryMessage?: string;
  } {
    const existing = this.records.get(sessionId);

    if (!result.isHealthy) {
      const count = (existing?.count ?? 0) + 1;
      this.records.set(sessionId, {
        sessionId,
        count,
        lastReason: result.reason ?? "Unknown anomaly",
        lastTimestamp: Date.now(),
      });

      const shouldEscalate = count >= this.config.maxConsecutiveAnomalies;

      return {
        shouldEscalate,
        consecutiveAnomalies: count,
        recoveryMessage: shouldEscalate ? this.config.escalationMessage : undefined,
      };
    }

    // Healthy output — reset counter
    if (existing) {
      this.records.set(sessionId, {
        ...existing,
        count: 0,
        lastReason: "reset on healthy output",
        lastTimestamp: Date.now(),
      });
    }

    return {
      shouldEscalate: false,
      consecutiveAnomalies: 0,
    };
  }

  /** Get the current anomaly record for a session. */
  getRecord(sessionId: string): AnomalyRecord | undefined {
    return this.records.get(sessionId);
  }

  /** Clear anomaly record for a specific session. */
  clearSession(sessionId: string): void {
    this.records.delete(sessionId);
  }

  /** Reset all tracking state (useful in tests). */
  resetAll(): void {
    this.records.clear();
  }

  /** Get the current config. */
  getConfig(): AnomalyTrackerConfig {
    return { ...this.config };
  }

  /** Update config at runtime. */
  setConfig(config: Partial<AnomalyTrackerConfig>): void {
    this.config = { ...this.config, ...config };
  }

  // ── Cross-invocation identical output detection ────────────────

  private lastOutput: string | null = null;
  private identicalOutputCount = 0;
  readonly MAX_IDENTICAL_OUTPUTS = 3;

  /**
   * Track output for repeated identical content.
   * Returns true if output should be flagged as degenerate.
   */
  trackOutput(text: string): boolean {
    if (text === this.lastOutput) {
      this.identicalOutputCount++;
      if (this.identicalOutputCount >= this.MAX_IDENTICAL_OUTPUTS) {
        return true; // Flagged — repeated identical output
      }
    } else {
      this.identicalOutputCount = 0;
    }
    this.lastOutput = text;
    return false;
  }
}
