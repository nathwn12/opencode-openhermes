import { tool } from "@opencode-ai/plugin"
import { handleLatest } from "./_memory.mjs"

export default tool({
  description: "Get the latest active OpenHermes memory record by class (returns the full record, not just metadata)",
  args: {
    class: tool.schema.enum(["audit", "checkpoint", "mistake", "instinct", "decision", "constraint", "backlog", "verification_receipt"]).describe("Memory class to get the latest from"),
  },
  async execute(args) {
    return handleLatest(args.class)
  },
})
