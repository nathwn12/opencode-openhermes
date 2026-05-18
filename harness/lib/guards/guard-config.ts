// ---------------------------------------------------------------------------
// GuardConfig — centralized configuration for all loop/safety guards
// ---------------------------------------------------------------------------

export interface GuardConfig {
  /** Max times the same skill can repeat in one chain before STOP */
  maxSkillRepeats: number
  /** Max consecutive unproductive hops before STOP (0 = disabled) */
  maxUnproductiveHops: number
  /** Max delegation (sub-agent) depth before STOP */
  maxDelegationDepth: number
  /** Consecutive anomalies before recovery escalation */
  maxConsecutiveAnomalies: number
  /** Max subagent failures on same task before BLOCKER */
  maxSubagentFailures: number
  /** Enable progressive warning at thresholds before hard stop */
  progressiveGuards: boolean
  /** Ratio of limit at which to warn (e.g. 0.6 = 60%) */
  progressiveWarnThreshold: number
  /** Ratio of limit at which to escalate (e.g. 0.8 = 80%) */
  progressiveEscalateThreshold: number
}

export const DEFAULT_GUARD_CONFIG: GuardConfig = {
  maxSkillRepeats: 5,
  maxUnproductiveHops: 8,
  maxDelegationDepth: 25,
  maxConsecutiveAnomalies: 2,
  maxSubagentFailures: 5,
  progressiveGuards: true,
  progressiveWarnThreshold: 0.6,
  progressiveEscalateThreshold: 0.8,
}

export type GuardLevel = "ok" | "warn" | "escalate" | "stop"

export interface GuardProgression {
  level: GuardLevel
  current: number
  limit: number
  /**
   * If progressive guards are disabled: stop at limit, ok otherwise.
   * If enabled: ok < warn% < escalate% < stop.
   */
}

export function checkGuardProgression(
  current: number,
  limit: number,
  config: GuardConfig,
): GuardProgression {
  if (!config.progressiveGuards || limit <= 0) {
    return {
      level: current >= limit ? "stop" as GuardLevel : "ok" as GuardLevel,
      current,
      limit,
    }
  }
  if (current >= limit) return { level: "stop", current, limit }
  if (current / limit >= config.progressiveEscalateThreshold) return { level: "escalate" as GuardLevel, current, limit }
  if (current / limit >= config.progressiveWarnThreshold) return { level: "warn" as GuardLevel, current, limit }
  return { level: "ok" as GuardLevel, current, limit }
}

/**
 * Merge partial user config(s) with defaults.
 * Priority: defaults → earlier args → later args (last wins).
 * Supports single-arg calls and multi-override chains.
 */
export function mergeGuardConfig(...overrides: Array<Partial<GuardConfig> | undefined>): GuardConfig {
  return Object.assign({}, DEFAULT_GUARD_CONFIG, ...overrides.filter(Boolean));
}
