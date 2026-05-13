import { tool } from "@opencode-ai/plugin"
import { getStore, CORE_CLASSES } from "./memory-store.mjs"
import { createLogger } from "./logger.mjs"
const log = createLogger("memory-tool")

const VALID_CLASSES = CORE_CLASSES

export const MemoryToolPlugin = async () => ({
  tool: {
    memory: tool({
      description: "Save or query memory records. Actions: save (class+id+data) or query (class+limit). Classes: checkpoint, mistake, decision.",
      args: {
        action: tool.schema.enum(["save", "query"]),
        class: tool.schema.enum(VALID_CLASSES),
        id: tool.schema.string().optional(),
        data: tool.schema.string().optional(),
        limit: tool.schema.number().optional(),
      },
      async execute(args) {
        try {
          if (args.action === "save") {
            if (!args.id || !args.data) return "id and data required for save"
            const parsed = JSON.parse(args.data)
            const record = {
              id: args.id,
              class: args.class,
              summary: parsed.summary || "",
              project: parsed.project || null,
              scope: parsed.scope || "session",
              status: parsed.status || "active",
              created_at: parsed.created_at || new Date().toISOString(),
              updated_at: new Date().toISOString(),
            }
            getStore().save(args.class, args.id, record)
            return `saved: ${args.id}`
          }
          if (args.action === "query") {
            const results = getStore().query(args.class, args.limit || 5)
            return results.map(r => `- ${r.id}: ${r.summary || "?"}`).join("\n") || "no records"
          }
          return `unknown action: ${args.action}`
        } catch (err) {
          log.error("memory tool error:", err?.message)
          return `error: ${err?.message}`
        }
      },
    }),
  },
})
