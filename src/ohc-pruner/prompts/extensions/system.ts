export function buildProtectedToolsExtension(tools: string[]): string {
  if (!tools || tools.length === 0) return ""
  return [
    `### Protected Tools`,
    `The following tools are protected from compression and must NOT have their outputs summarized away:`,
    tools.map(t => `- \`${t}\``).join("\n"),
    `When a protected tool appears in a compression range, include its full output in the summary.`,
  ].join("\n")
}

export function buildManualModeExtension(): string {
  return [
    `### Manual Mode`,
    `You are operating in manual compression mode.`,
    `Do NOT trigger the \`compress\` tool autonomously.`,
    `Wait for the user to issue \`/ohc compress\` before compressing.`,
  ].join("\n")
}

export function buildSubAgentExtension(): string {
  return [
    `### Subagent Context Pruning`,
    `As a subagent, you still have access to the \`compress\` tool.`,
    `Compress only if context pressure is critical and you have completed conversation segments.`,
    `Prefer returning complete results over aggressive compression.`,
  ].join("\n")
}

export function renderSystemPromptExtensions(
  basePrompt: string,
  protectedToolsExtension?: string,
  manualModeExtension?: string,
  subAgentExtension?: string,
): string {
  const parts: string[] = [basePrompt]
  if (protectedToolsExtension) parts.push("", protectedToolsExtension)
  if (manualModeExtension) parts.push("", manualModeExtension)
  if (subAgentExtension) parts.push("", subAgentExtension)
  return parts.join("\n")
}
