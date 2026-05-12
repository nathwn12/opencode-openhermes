import { resolveLimitValue } from "./config.mjs"

export const OHC_STATES = {
  DISABLED_BELOW_THRESHOLD: "DISABLED_BELOW_THRESHOLD",
  EVALUATION_ALLOWED: "EVALUATION_ALLOWED",
  ACTION_REQUIRED: "ACTION_REQUIRED",
  MANUAL_OVERRIDE: "MANUAL_OVERRIDE",
  NO_ACTION: "NO_ACTION",
}

export function evaluateState(totalTokens, minThreshold, maxThreshold, config, stateMetadata, modelContextLimit) {
  let resolvedMax = maxThreshold
  let resolvedMin = minThreshold

  if (modelContextLimit) {
    resolvedMax = resolveLimitValue(maxThreshold, modelContextLimit)
    resolvedMin = resolveLimitValue(minThreshold, modelContextLimit)

    const modelKey = stateMetadata?.modelKey
    if (modelKey && config?.compress?.modelMaxLimits?.[modelKey]) {
      resolvedMax = resolveLimitValue(config.compress.modelMaxLimits[modelKey], modelContextLimit)
    }
    if (modelKey && config?.compress?.modelMinLimits?.[modelKey]) {
      resolvedMin = resolveLimitValue(config.compress.modelMinLimits[modelKey], modelContextLimit)
    }
  }

  if (resolvedMin >= resolvedMax - 10000) {
    resolvedMin = Math.max(10000, resolvedMax - 10000)
  }

  const isManual =
    config?.manualMode?.enabled === true ||
    stateMetadata?.manualMode === true ||
    stateMetadata?.manualMode === "active"
  const pct = resolvedMax > 0 ? totalTokens / resolvedMax : 0
  const isFirstChat =
    (stateMetadata?.currentTurn === 0 || stateMetadata?.currentTurn === undefined) &&
    !stateMetadata?.hasPriorState

  if (isManual) {
    return {
      state: OHC_STATES.MANUAL_OVERRIDE,
      reason: "Manual mode is enabled; agent will not autonomously compress",
      measuredTokens: totalTokens,
      thresholdMin: resolvedMin,
      thresholdMax: resolvedMax,
      pct,
      isFirstChat,
      decision: { action: "manual_override", measuredTokens: totalTokens, thresholdMin: resolvedMin, thresholdMax: resolvedMax, pct, reason: "Manual mode is enabled" },
    }
  }

  if (totalTokens < resolvedMin) {
    return {
      state: OHC_STATES.DISABLED_BELOW_THRESHOLD,
      reason: `Total tokens (${totalTokens}) below min threshold (${resolvedMin})`,
      measuredTokens: totalTokens,
      thresholdMin: resolvedMin,
      thresholdMax: resolvedMax,
      pct,
      isFirstChat,
      decision: { action: "noop", measuredTokens: totalTokens, thresholdMin: resolvedMin, thresholdMax: resolvedMax, pct, reason: `Below min threshold of ${resolvedMin}` },
    }
  }

  if (totalTokens >= resolvedMax) {
    return {
      state: OHC_STATES.ACTION_REQUIRED,
      reason: `Total tokens (${totalTokens}) at or above max threshold (${resolvedMax})`,
      measuredTokens: totalTokens,
      thresholdMin: resolvedMin,
      thresholdMax: resolvedMax,
      pct,
      isFirstChat,
      decision: { action: "auto_prune", measuredTokens: totalTokens, thresholdMin: resolvedMin, thresholdMax: resolvedMax, pct, reason: `At or above max threshold of ${resolvedMax}` },
    }
  }

  if (totalTokens >= resolvedMin && totalTokens < resolvedMax) {
    return {
      state: OHC_STATES.EVALUATION_ALLOWED,
      reason: `Total tokens (${totalTokens}) between min (${resolvedMin}) and max (${resolvedMax})`,
      measuredTokens: totalTokens,
      thresholdMin: resolvedMin,
      thresholdMax: resolvedMax,
      pct,
      isFirstChat,
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
    isFirstChat,
    decision: { action: "none", measuredTokens: totalTokens, thresholdMin: resolvedMin, thresholdMax: resolvedMax, pct, reason: "Default state" },
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
