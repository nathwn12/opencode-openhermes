import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs"
import { join } from "node:path"
import { homedir } from "node:os"

const GLOBAL_PROMPT_DIR = join(homedir(), ".config", "opencode", "ohc", "prompts")

export interface PromptCollection {
  system: string
  "compress-range": string
  "compress-message": string
  "context-limit-nudge": string
  "turn-nudge": string
  "iteration-nudge": string
}

const DEFAULT_PROMPTS: PromptCollection = {
  system: `## Context Compression Protocol
You have access to a \`compress\` tool that reduces token usage by summarizing closed conversation spans.
When you see a context-pressure notification, immediately use the \`compress\` tool on the oldest closed topics.
Never compress the active, most recent work.`,
  "compress-range": `You are an expert at summarizing technical conversation ranges for context compression.
Preserve all critical implementation details, decisions, and findings.
Output format: a comprehensive technical summary of the conversation range.`,
  "compress-message": `You are an expert at summarizing individual conversation messages for context compression.
Preserve all critical implementation details, decisions, and findings.
Output format: a concise technical summary of the message.`,
  "context-limit-nudge": `Token usage is approaching the context limit.
Consider using the \`compress\` tool to reduce context pressure.`,
  "turn-nudge": `Many turns since last user message.
Consider using the \`compress\` tool to reduce context pressure.`,
  "iteration-nudge": `Many iterations without compression.
Consider using the \`compress\` tool to reduce context pressure.`,
}

export class PromptStore {
  private overrides: Partial<PromptCollection> = {}
  private configDir?: string
  private projectDir?: string

  constructor(configDir?: string, projectDir?: string) {
    this.configDir = configDir
    this.projectDir = projectDir
  }

  reload(): void {
    const overrides: Partial<PromptCollection> = {}

    for (const dir of [this.projectDir, this.configDir, GLOBAL_PROMPT_DIR].filter(Boolean)) {
      if (!dir) continue
      if (!existsSync(dir)) continue
      for (const key of Object.keys(DEFAULT_PROMPTS) as Array<keyof PromptCollection>) {
        const filePath = join(dir, `${key}.md`)
        if (existsSync(filePath)) {
          try {
            overrides[key] = readFileSync(filePath, "utf8")
          } catch {}
        }
      }
    }

    this.overrides = overrides
  }

  ensureDefaultFiles(): void {
    if (!existsSync(GLOBAL_PROMPT_DIR)) {
      mkdirSync(GLOBAL_PROMPT_DIR, { recursive: true })
    }
    for (const [key, content] of Object.entries(DEFAULT_PROMPTS)) {
      const filePath = join(GLOBAL_PROMPT_DIR, `${key}.md`)
      if (!existsSync(filePath)) {
        try {
          writeFileSync(filePath, content, "utf8")
        } catch {}
      }
    }
  }

  getRuntimePrompts(): PromptCollection {
    const result = { ...DEFAULT_PROMPTS }
    for (const key of Object.keys(DEFAULT_PROMPTS) as Array<keyof PromptCollection>) {
      if (this.overrides[key]) {
        result[key] = this.overrides[key]!
      }
    }
    return result
  }

  get(key: keyof PromptCollection): string {
    return this.overrides[key] || DEFAULT_PROMPTS[key]
  }
}
