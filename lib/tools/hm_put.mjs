import { tool } from "@opencode-ai/plugin"
import { handlePut } from "./_memory.mjs"

export default tool({
  description: "Create or update an OpenHermes memory record (checkpoints, mistakes, decisions, constraints, instincts, audits, backlog items, verification receipts)",
  args: {
    class: tool.schema.enum(["audit", "checkpoint", "mistake", "instinct", "decision", "constraint", "backlog", "verification_receipt"]).describe("Memory class to write to"),
    id: tool.schema.string().describe("Unique record ID (e.g. 'chk_2026-01-01T00-00-00-000Z')"),
    data: tool.schema.string().describe("JSON string of the record fields (summary, scope, provenance, etc.)"),
  },
  async execute(args) {
    return handlePut(args.class, args.id, args.data)
  },
})
