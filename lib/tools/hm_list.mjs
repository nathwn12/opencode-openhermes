import { tool } from "@opencode-ai/plugin"
import { handleList } from "./_memory.mjs"

export default tool({
  description: "List OpenHermes memory records by class, sorted by recency (newest first)",
  args: {
    class: tool.schema.enum(["audit", "checkpoint", "mistake", "instinct", "decision", "constraint", "backlog", "verification_receipt"]).describe("Memory class to list"),
    limit: tool.schema.number().optional().default(10).describe("Max results (max 100)"),
  },
  async execute(args) {
    return handleList(args.class, args.limit)
  },
})
