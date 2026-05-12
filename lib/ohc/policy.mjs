export const OHC_STATES = {
  DISABLED_BELOW_THRESHOLD: "DISABLED_BELOW_THRESHOLD",
  EVALUATION_ALLOWED: "EVALUATION_ALLOWED",
  ACTION_REQUIRED: "ACTION_REQUIRED",
  MANUAL_OVERRIDE: "MANUAL_OVERRIDE",
  NO_ACTION: "NO_ACTION",
}

export function evaluateState(totalTokens, minThreshold, maxThreshold, config, stateMetadata) {
  const isManual =
    config?.manualMode?.enabled === true ||
    stateMetadata?.manualMode === true ||
    stateMetadata?.manualMode === "active"
  const pct = maxThreshold > 0 ? totalTokens / maxThreshold : 0
  const isFirstChat =
    (stateMetadata?.currentTurn === 0 || stateMetadata?.currentTurn === undefined) &&
    !stateMetadata?.hasPriorState

  if (isManual) {
    return {
      state: OHC_STATES.MANUAL_OVERRIDE,
      reason: "Manual mode is enabled; agent will not autonomously compress",
      measuredTokens: totalTokens,
      thresholdMin: minThreshold,
      thresholdMax: maxThreshold,
      pct,
      isFirstChat,
      decision: { action: "manual_override", measuredTokens: totalTokens, thresholdMin: minThreshold, thresholdMax: maxThreshold, pct, reason: "Manual mode is enabled" },
    }
  }

  if (totalTokens < minThreshold) {
    return {
      state: OHC_STATES.DISABLED_BELOW_THRESHOLD,
      reason: `Total tokens (${totalTokens}) below min threshold (${minThreshold})`,
      measuredTokens: totalTokens,
      thresholdMin: minThreshold,
      thresholdMax: maxThreshold,
      pct,
      isFirstChat,
      decision: { action: "noop", measuredTokens: totalTokens, thresholdMin: minThreshold, thresholdMax: maxThreshold, pct, reason: `Below min threshold of ${minThreshold}` },
    }
  }

  if (totalTokens >= maxThreshold) {
    return {
      state: OHC_STATES.ACTION_REQUIRED,
      reason: `Total tokens (${totalTokens}) at or above max threshold (${maxThreshold})`,
      measuredTokens: totalTokens,
      thresholdMin: minThreshold,
      thresholdMax: maxThreshold,
      pct,
      isFirstChat,
      decision: { action: "auto_prune", measuredTokens: totalTokens, thresholdMin: minThreshold, thresholdMax: maxThreshold, pct, reason: `At or above max threshold of ${maxThreshold}` },
    }
  }

  if (totalTokens >= minThreshold && totalTokens < maxThreshold) {
    return {
      state: OHC_STATES.EVALUATION_ALLOWED,
      reason: `Total tokens (${totalTokens}) between min (${minThreshold}) and max (${maxThreshold})`,
      measuredTokens: totalTokens,
      thresholdMin: minThreshold,
      thresholdMax: maxThreshold,
      pct,
      isFirstChat,
      decision: { action: "evaluate", measuredTokens: totalTokens, thresholdMin: minThreshold, thresholdMax: maxThreshold, pct, reason: "Within evaluation range" },
    }
  }

  return {
    state: OHC_STATES.NO_ACTION,
    reason: "Default no-action state",
    measuredTokens: totalTokens,
    thresholdMin: minThreshold,
    thresholdMax: maxThreshold,
    pct,
    isFirstChat,
    decision: { action: "none", measuredTokens: totalTokens, thresholdMin: minThreshold, thresholdMax: maxThreshold, pct, reason: "Default state" },
  }
}

export function isActionAllowed(ohcState) {
  return ohcState.state === OHC_STATES.ACTION_REQUIRED || ohcState.state === OHC_STATES.MANUAL_OVERRIDE
}

export function isMutationAllowed(ohcState) {
  return ohcState.state === OHC_STATES.EVALUATION_ALLOWED || ohcState.state === OHC_STATES.ACTION_REQUIRED || ohcState.state === OHC_STATES.MANUAL_OVERRIDE
}

export function isNudgeAllowed(ohcState) {
  return ohcState.state === OHC_STATES.EVALUATION_ALLOWED || ohcState.state === OHC_STATES.ACTION_REQUIRED || ohcState.state === OHC_STATES.MANUAL_OVERRIDE
}

export function isBelowThreshold(ohcState) {
  return ohcState.state === OHC_STATES.DISABLED_BELOW_THRESHOLD
}
