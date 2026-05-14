import { BootstrapPlugin } from "./bootstrap.mjs"
import { CuratorPlugin } from "./curator.mjs"
import { AutorecallPlugin } from "./autorecall.mjs"
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
    AutorecallPlugin(input),
  ])
  const names = ["Bootstrap", "AmbientMemory", "Curator", "MemoryTool", "Autorecall"]
  const succeeded = []
  const merged = {}
  for (let i = 0; i < results.length; i++) {
    if (results[i].status === "rejected") {
      const err = results[i].reason
      log.error(`✗ ${names[i]} plugin FAILED: ${err?.message || err}`)
      if (err?.stack) log.debug(`  stack: ${err.stack.split("\n").slice(0, 3).join("; ")}`)
      continue
    }
    succeeded.push(names[i])
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
  if (succeeded.length === names.length) {
    log.info(`all ${names.length} plugins loaded`)
  } else {
    log.warn(`plugins loaded: ${succeeded.join(", ")} | failed: ${names.filter(n => !succeeded.includes(n)).join(", ")}`)
  }
  return merged
}
