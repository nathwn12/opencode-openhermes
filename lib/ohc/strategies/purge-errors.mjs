import { isToolNameProtected, getFilePathsFromParameters, isFilePathProtected } from "../protected-patterns.mjs"
import { getTotalToolTokens } from "../token-utils.mjs"

export function purgeErrors(state, config, messages) {
  if (state.manualMode && !config.manualMode?.automaticStrategies) return

  if (!config.strategies?.purgeErrors?.enabled) return

  const allIds = state.toolIdList
  if (!allIds?.length) return

  const unprunedIds = allIds.filter(id => !state.prune.tools.has(id))
  if (!unprunedIds.length) return

  const protectedTools = config.strategies.purgeErrors.protectedTools || []
  const threshold = Math.max(1, config.strategies.purgeErrors.turns ?? 4)

  const toPrune = []
  for (const id of unprunedIds) {
    const meta = state.toolParameters.get(id)
    if (!meta) continue

    if (isToolNameProtected(meta.tool, protectedTools)) continue

    const fps = getFilePathsFromParameters(meta.tool, meta.parameters)
    if (isFilePathProtected(fps, config.protectedFilePatterns)) continue

    if (meta.status !== "error") continue

    const turnAge = state.currentTurn - meta.turn
    if (turnAge >= threshold) {
      toPrune.push(id)
    }
  }

  if (!toPrune.length) return

  state.stats.totalPruneTokens += getTotalToolTokens(state, toPrune)
  for (const id of toPrune) {
    const entry = state.toolParameters.get(id)
    state.prune.tools.set(id, entry?.tokenCount ?? 0)
  }
}
