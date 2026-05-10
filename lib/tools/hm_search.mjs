import { tool } from "@opencode-ai/plugin"
import { handleSearch } from "./_memory.mjs"

export default tool({
  description: "Search OpenHermes memory records with keyword matching and relevance ranking. Searches across all classes by default.",
  args: {
    query: tool.schema.string().describe("Search query string (matches against summary, id, description, tags, etc.)"),
    scope: tool.schema.enum(["global", "local", "auto"]).optional().default("auto").describe("Search scope: global (only global-scope records), local (only project/session-scope), auto (all)"),
    classes: tool.schema.array(tool.schema.enum(["audit", "checkpoint", "mistake", "instinct", "decision", "constraint", "backlog", "verification_receipt"])).optional().describe("Memory classes to search (default: all)"),
    project: tool.schema.string().optional().describe("Project name filter for boosted relevance scoring"),
    limit: tool.schema.number().optional().default(10).describe("Max results (max 50)"),
  },
  async execute(args) {
    return handleSearch(args.query, args.scope, args.classes, args.project, args.limit)
  },
})
