import { AutorecallPlugin } from "./autorecall.mjs"
import { CuratorPlugin } from "./curator.mjs"
import { SkillBuilderPlugin } from "./skill-builder.mjs"
import { BootstrapPlugin } from "./bootstrap.mjs"
import { MemoryToolsPlugin } from "./lib/memory-tools-plugin.mjs"
import { AmbientMemoryPlugin } from "./lib/ambient-memory.mjs"
import { OhcPlugin } from "./lib/ohc/pruner.mjs"
import { UpdaterPlugin } from "./lib/ohc/updater.mjs"
import { createLogger } from "./lib/logger.mjs"

const log = createLogger("index")

const PLUGINS = [
  { name: "Bootstrap", factory: BootstrapPlugin },
  { name: "Autorecall", factory: AutorecallPlugin },
  { name: "Curator", factory: CuratorPlugin },
  { name: "SkillBuilder", factory: SkillBuilderPlugin },
  { name: "MemoryTools", factory: MemoryToolsPlugin },
  { name: "AmbientMemory", factory: AmbientMemoryPlugin },
  { name: "Ohc", factory: OhcPlugin },
  { name: "Updater", factory: UpdaterPlugin },
]

function chain(...fns) {
  const h = fns.filter(Boolean)
  if (!h.length) return undefined
  if (h.length === 1) return h[0]
  return async (i, o) => { for (const fn of h) await fn(i, o) }
}

export default async (input) => {
  const results = await Promise.allSettled(PLUGINS.map(p => p.factory(input)))

  const _degraded = []
  for (let i = 0; i < results.length; i++) {
    const r = results[i]
    if (r.status === "rejected") {
      _degraded.push({ plugin: PLUGINS[i].name, error: r.reason?.message || String(r.reason) })
      log.error(`${PLUGINS[i].name} plugin failed:`, r.reason)
    }
  }

  function resolve(idx) {
    const r = results[idx]
    if (r.status === "fulfilled") return r.value
    return {}
  }

  const [bootstrap, autorecall, curator, skillBuilder, memoryTools, ambient, ohc, updater] = PLUGINS.map((_, i) => resolve(i))

  const merged = {}

  if (bootstrap.config) merged.config = bootstrap.config

  const toolHandlers = { ...memoryTools.tool, ...ohc.tool }
  if (_degraded.length > 0) {
    toolHandlers._degraded = {
      description: "List degraded/errored plugins",
      execute: async () => {
        const lines = _degraded.map(d => `  - ${d.plugin}: ${d.error}`)
        return `Degraded plugins (${_degraded.length}):\n${lines.join("\n")}`
      },
    }
  }
  if (Object.keys(toolHandlers).length) merged.tool = toolHandlers

  merged["experimental.chat.system.transform"] = chain(ohc["experimental.chat.system.transform"])
  merged["experimental.chat.messages.transform"] = chain(
    ambient["experimental.chat.messages.transform"],
    bootstrap["experimental.chat.messages.transform"],
    ohc["experimental.chat.messages.transform"],
  )
  merged["command.execute.before"] = chain(updater["command.execute.before"], ohc["command.execute.before"])

  const eventHandlers = [autorecall.event, curator.event, skillBuilder.event].filter(Boolean)
  if (eventHandlers.length) {
    merged.event = async (payload) => {
      await Promise.allSettled(eventHandlers.map(fn => fn(payload)))
    }
  }

  for (const hook of ["experimental.session.compacting", "tool.execute.after"]) {
    const handler = chain(curator[hook], skillBuilder[hook])
    if (handler) merged[hook] = handler
  }

  return merged
}
