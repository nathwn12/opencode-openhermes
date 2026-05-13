import path from "node:path"
import fs from "node:fs"
import { getStore } from "./lib/memory-store.mjs"
import { getRecallRoot } from "./lib/paths.mjs"
import { createLogger } from "./lib/logger.mjs"
const log = createLogger("autorecall")

export const AutorecallPlugin = async ({ project, directory }) => ({
  event: async ({ event }) => {
    try {
      if (event.type !== "session.created") return
      const projectKey = project?.name || path.basename(directory)
      const cacheDir = getRecallRoot()
      fs.mkdirSync(cacheDir, { recursive: true })
      const records = getStore().query(projectKey, 5)
      fs.writeFileSync(path.join(cacheDir, "cache.json"), JSON.stringify({
        records, project: projectKey, updated_at: new Date().toISOString()
      }, null, 2), "utf8")
    } catch (err) { log.error("autorecall error:", err?.message) }
  },
})
