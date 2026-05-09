export function countTokens(text: string): number {
  if (!text) return 0
  try {
    return Math.round(text.length / 4)
  } catch {
    return 0
  }
}

export function estimateTokensBatch(texts: string[]): number {
  if (texts.length === 0) return 0
  return countTokens(texts.join(" "))
}

function stringifyToolContent(value: unknown): string {
  return typeof value === "string" ? value : JSON.stringify(value)
}

function extractToolContent(part: any): string[] {
  const contents: string[] = []
  if (part?.type !== "tool") return contents
  if (part.state?.input !== undefined) {
    contents.push(stringifyToolContent(part.state.input))
  }
  if (part.state?.status === "completed" && part.state?.output !== undefined) {
    contents.push(stringifyToolContent(part.state.output))
  } else if (part.state?.status === "error" && part.state?.error) {
    contents.push(stringifyToolContent(part.state.error))
  }
  return contents
}

export function extractCompletedToolOutput(part: any): string | undefined {
  if (part?.type !== "tool" || part.state?.status !== "completed" || part.state?.output === undefined) {
    return undefined
  }
  return stringifyToolContent(part.state.output)
}

export function countToolTokens(part: any): number {
  const contents = extractToolContent(part)
  return estimateTokensBatch(contents)
}

export function countMessageTextTokens(msg: Record<string, unknown>): number {
  const texts: string[] = []
  const parts = Array.isArray(msg.parts) ? (msg.parts as any[]) : []
  for (const part of parts) {
    if (part.type === "text") texts.push(part.text as string)
  }
  if (texts.length === 0) return 0
  return estimateTokensBatch(texts)
}

export function countAllMessageTokens(msg: Record<string, unknown>): number {
  const parts = Array.isArray(msg.parts) ? (msg.parts as any[]) : []
  const texts: string[] = []
  for (const part of parts) {
    if (part.type === "text") {
      texts.push(part.text as string)
    } else {
      texts.push(...extractToolContent(part))
    }
  }
  if (texts.length === 0) return 0
  return estimateTokensBatch(texts)
}

export function getCurrentTokenUsage(messages: unknown[]): number {
  let total = 0
  for (const msg of messages) {
    total += countAllMessageTokens(msg as Record<string, unknown>)
  }
  return total
}
