import { totalTokens } from "./reaper.mjs"

export { totalTokens }

export function countTokens(value) {
  if (typeof value === "string") return Math.ceil(value.length / 4)
  if (typeof value === "object" && value !== null) return Math.ceil(JSON.stringify(value).length / 4)
  return 0
}

export function getTotalToolTokens(state, toolIds) {
  let total = 0
  for (const id of toolIds) {
    const entry = state.toolParameters.get(id)
    if (entry?.tokenCount) total += entry.tokenCount
  }
  return total
}

export function estimateToolTokenCost(part) {
  if (part.type !== "tool") return 0
  let t = 0
  if (part.state?.input) t += countTokens(part.state.input)
  if (part.state?.output) t += countTokens(part.state.output)
  return t
}
