import { BootstrapPlugin } from "./bootstrap.mjs"
import { CuratorPlugin } from "./curator.mjs"
import { AmbientMemoryPlugin } from "./lib/ambient-memory.mjs"
import { MemoryToolPlugin } from "./lib/memory-tool.mjs"
import { createLogger } from "./lib/logger.mjs"
const log = createLogger("index")

export default async (input) => {
  const results = await Promise.allSettled([
    BootstrapPlugin(input),
    AmbientMemoryPlugin(input),
    CuratorPlugin(input),
    MemoryToolPlugin(input),
  ])
  const names = ["Bootstrap", "AmbientMemory", "Curator", "MemoryTool"]
  const merged = {}
  for (let i = 0; i < results.length; i++) {
    if (results[i].status === "rejected") {
      log.error(`${names[i]} plugin failed:`, results[i].reason?.message)
      continue
    }
    const plugin = results[i].value
    for (const [hook, fn] of Object.entries(plugin)) {
      if (!fn) continue
      if (merged[hook]) {
        const prev = merged[hook]
        merged[hook] = async (i, o) => { await prev(i, o); await fn(i, o) }
      } else {
        merged[hook] = fn
      }
    }
  }
  return merged
}
