import { isToolNameProtected, getFilePathsFromParameters, isFilePathProtected } from "../protected-patterns.mjs"
import { getTotalToolTokens } from "../token-utils.mjs"

export function deduplicate(state, config, messages) {
  if (state.manualMode && !config.manualMode?.automaticStrategies) return

  if (!config.strategies?.deduplication?.enabled) return

  const allIds = state.toolIdList
  if (!allIds?.length) return

  const unprunedIds = allIds.filter(id => !state.prune.tools.has(id))
  if (!unprunedIds.length) return

  const protectedTools = config.strategies.deduplication.protectedTools || []

  const sigMap = new Map()

  for (const id of unprunedIds) {
    const meta = state.toolParameters.get(id)
    if (!meta) continue

    if (isToolNameProtected(meta.tool, protectedTools)) continue

    const fps = getFilePathsFromParameters(meta.tool, meta.parameters)
    if (isFilePathProtected(fps, config.protectedFilePatterns)) continue

    const sig = createToolSignature(meta.tool, meta.parameters)
    if (!sigMap.has(sig)) sigMap.set(sig, [])
    sigMap.get(sig).push(id)
  }

  const toPrune = []
  for (const ids of sigMap.values()) {
    if (ids.length > 1) {
      toPrune.push(...ids.slice(0, -1))
    }
  }

  if (!toPrune.length) return

  state.stats.totalPruneTokens += getTotalToolTokens(state, toPrune)
  for (const id of toPrune) {
    const entry = state.toolParameters.get(id)
    state.prune.tools.set(id, entry?.tokenCount ?? 0)
  }
}

function createToolSignature(tool, params) {
  if (!params) return tool
  const norm = normalizeParams(params)
  const sorted = sortKeys(norm)
  return `${tool}::${JSON.stringify(sorted)}`
}

function normalizeParams(p) {
  if (typeof p !== "object" || p === null) return p
  if (Array.isArray(p)) return p
  const n = {}
  for (const [k, v] of Object.entries(p)) {
    if (v !== undefined && v !== null) n[k] = v
  }
  return n
}

function sortKeys(o) {
  if (typeof o !== "object" || o === null) return o
  if (Array.isArray(o)) return o.map(sortKeys)
  const s = {}
  for (const k of Object.keys(o).sort()) s[k] = sortKeys(o[k])
  return s
}
