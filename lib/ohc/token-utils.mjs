import { countTokens } from "./tokenizer.mjs"
import { totalTokens } from "./reaper.mjs"

export { totalTokens }

export { countTokens }

export function getTotalToolTokens(state, toolIds) {
  let total = 0
  for (const id of toolIds) {
    const entry = state.toolParameters.get(id)
    if (entry?.tokenCount) total += entry.tokenCount
  }
  return total
}

function estimateToolTokenCost(part) {
  if (part.type !== "tool") return 0
  let t = 0
  if (part.state?.input) t += countTokens(typeof part.state.input === "string" ? part.state.input : JSON.stringify(part.state.input))
  if (part.state?.output) t += countTokens(typeof part.state.output === "string" ? part.state.output : JSON.stringify(part.state.output))
  return t
}
