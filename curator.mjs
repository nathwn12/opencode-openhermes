import path from "node:path"
import { getStore } from "./lib/memory-store.mjs"
import { createLogger } from "./lib/logger.mjs"
const log = createLogger("curator")

export const CuratorPlugin = async ({ project, directory }) => ({
  event: async ({ event }) => {
    try {
      if (event.type === "session.created") {
        log.info(`session started: ${project?.name || path.basename(directory)}`)
      }
    } catch (err) { log.error("curator event error:", err?.message) }
  },
  "experimental.session.compacting": async (_input, output) => {
    try {
      const projectKey = project?.name || path.basename(directory)
      const ts = new Date().toISOString()
      const ckId = `chk_${ts.replace(/[:.]/g, "-")}`
      getStore().save("checkpoint", ckId, {
        id: ckId, class: "checkpoint", summary: `Pre-compaction: ${projectKey}`,
        project: projectKey, status: "active", created_at: ts, updated_at: ts,
      })
      const latest = getStore().latest("checkpoint")
      const recentDecision = getStore().list("decision", 1)
      const recentMistake = getStore().list("mistake", 1)
      const inject = [
        `## OpenHermes State`,
        `- Project: ${projectKey}`,
        `- Checkpoint: ${latest?.summary || "none"}`,
        recentDecision[0] ? `- Last decision: ${recentDecision[0].summary}` : null,
        recentMistake[0] ? `- Last mistake: ${recentMistake[0].summary}` : null,
      ].filter(Boolean).join("\n")
      const ctx = Array.isArray(output.context) ? output.context : (output.context = [])
      ctx.push(inject)
    } catch (err) { log.error("compaction error:", err?.message) }
  },
})
