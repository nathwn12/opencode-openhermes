export const OHC_STATES = {
  DISABLED_BELOW_THRESHOLD: "DISABLED_BELOW_THRESHOLD",
  EVALUATION_ALLOWED: "EVALUATION_ALLOWED",
  ACTION_REQUIRED: "ACTION_REQUIRED",
  NO_ACTION: "NO_ACTION",
}

export function evaluateState(totalTokens, config) {
  let resolvedMax = config.max
  let resolvedMin = config.min

  if (resolvedMin >= resolvedMax - 10000) {
    resolvedMin = Math.max(10000, resolvedMax - 10000)
  }

  const effectiveTrigger = config._effectiveMaxTrigger || resolvedMax
  const pct = resolvedMax > 0 ? totalTokens / resolvedMax : 0

  if (totalTokens < resolvedMin) {
    return {
      state: OHC_STATES.DISABLED_BELOW_THRESHOLD,
      reason: `Total tokens (${totalTokens}) below min threshold (${resolvedMin})`,
      measuredTokens: totalTokens,
      thresholdMin: resolvedMin,
      thresholdMax: resolvedMax,
      pct,
      decision: { action: "noop", measuredTokens: totalTokens, thresholdMin: resolvedMin, thresholdMax: resolvedMax, pct, reason: `Below min threshold of ${resolvedMin}` },
    }
  }

  if (totalTokens >= effectiveTrigger) {
    return {
      state: OHC_STATES.ACTION_REQUIRED,
      reason: `Total tokens (${totalTokens}) at or above trigger threshold (${effectiveTrigger})`,
      measuredTokens: totalTokens,
      thresholdMin: resolvedMin,
      thresholdMax: resolvedMax,
      pct,
      decision: { action: "auto_prune", measuredTokens: totalTokens, thresholdMin: resolvedMin, thresholdMax: resolvedMax, pct, reason: `At or above trigger threshold of ${effectiveTrigger}` },
    }
  }

  if (totalTokens >= resolvedMin && totalTokens < effectiveTrigger) {
    return {
      state: OHC_STATES.EVALUATION_ALLOWED,
      reason: `Total tokens (${totalTokens}) between min (${resolvedMin}) and trigger (${effectiveTrigger})`,
      measuredTokens: totalTokens,
      thresholdMin: resolvedMin,
      thresholdMax: resolvedMax,
      pct,
      decision: { action: "evaluate", measuredTokens: totalTokens, thresholdMin: resolvedMin, thresholdMax: resolvedMax, pct, reason: "Within evaluation range" },
    }
  }

  return {
    state: OHC_STATES.NO_ACTION,
    reason: "Default no-action state",
    measuredTokens: totalTokens,
    thresholdMin: resolvedMin,
    thresholdMax: resolvedMax,
    pct,
    decision: { action: "none", measuredTokens: totalTokens, thresholdMin: resolvedMin, thresholdMax: resolvedMax, pct, reason: "Default state" },
  }
}

export function isMutationAllowed(ohcState) {
  return ohcState.state === OHC_STATES.EVALUATION_ALLOWED || ohcState.state === OHC_STATES.ACTION_REQUIRED
}

export function isBelowThreshold(ohcState) {
  return ohcState.state === OHC_STATES.DISABLED_BELOW_THRESHOLD
}
