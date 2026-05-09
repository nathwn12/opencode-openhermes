import type { SessionState } from "../state.js"

const BLOCK_PLACEHOLDER_REGEX = /\(b(\d+)\)|\{block_(\d+)\}/gi

export function parseBlockPlaceholders(summary: string): Array<{
  raw: string
  blockId: string
  startIndex: number
  endIndex: number
}> {
  const placeholders: Array<{
    raw: string
    blockId: string
    startIndex: number
    endIndex: number
  }> = []
  const regex = new RegExp(BLOCK_PLACEHOLDER_REGEX.source, "gi")

  let match: RegExpExecArray | null
  while ((match = regex.exec(summary)) !== null) {
    const full = match[0]
    const blockIdPart = match[1] || match[2]
    placeholders.push({
      raw: full,
      blockId: `b${blockIdPart}`,
      startIndex: match.index,
      endIndex: match.index + full.length,
    })
  }

  return placeholders
}

export function stripSummaryHeader(summary: string): string {
  const headerMatch = summary.match(/^\s*\[Compressed conversation(?: section)?(?: b\d+)?\]/i)
  if (!headerMatch) return summary
  const afterHeader = summary.slice(headerMatch[0].length)
  return afterHeader.replace(/^(?:\r?\n)+/, "")
    .replace(/(?:\r?\n)*<ohc-message-id>b\d+<\/ohc-message-id>\s*$/i, "")
    .replace(/(?:\r?\n)+$/, "")
}
