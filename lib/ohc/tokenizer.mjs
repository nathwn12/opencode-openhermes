import { encode, decode, isWithinTokenLimit } from "gpt-tokenizer"

export function countTokens(text) {
  if (!text || typeof text !== "string") return 0
  try { return encode(text).length }
  catch { return Math.ceil(text.length / 4) }
}

export function truncateToTokens(text, maxTokens) {
  if (!text) return ""
  if (maxTokens <= 0) return ""
  try {
    const tokens = encode(text)
    if (tokens.length <= maxTokens) return text
    return decode(tokens.slice(0, maxTokens))
  } catch { return text.slice(0, maxTokens * 4) }
}

export function isWithinLimit(text, limit) {
  try { return isWithinTokenLimit(text, limit) }
  catch { return text.length <= limit * 4 }
}
