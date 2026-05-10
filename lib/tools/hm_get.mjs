import { tool } from "@opencode-ai/plugin"
import { handleGet } from "./_memory.mjs"

export default tool({
  description: "Get a specific OpenHermes memory record by class and ID",
  args: {
    class: tool.schema.enum(["audit", "checkpoint", "mistake", "instinct", "decision", "constraint", "backlog", "verification_receipt"]).describe("Memory class"),
    id: tool.schema.string().describe("Record ID to retrieve"),
  },
  async execute(args) {
    return handleGet(args.class, args.id)
  },
})
