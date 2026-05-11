import { AutorecallPlugin } from "./autorecall.mjs"
import { CuratorPlugin } from "./curator.mjs"
import { SkillBuilderPlugin } from "./skill-builder.mjs"
import { BootstrapPlugin } from "./bootstrap.mjs"
import { MemoryToolsPlugin } from "./lib/memory-tools-plugin.mjs"
import { OhcPlugin } from "./lib/ohc/pruner.mjs"
import { UpdaterPlugin } from "./lib/ohc/updater.mjs"

function chain(...fns) {
  const h = fns.filter(Boolean)
  if (!h.length) return undefined
  if (h.length === 1) return h[0]
  return async (i, o) => { for (const fn of h) await fn(i, o) }
}

export default async (input) => {
  const [bootstrap, autorecall, curator, skillBuilder, memoryTools, ohc, updater] = await Promise.all([
    BootstrapPlugin(input),
    AutorecallPlugin(input),
    CuratorPlugin(input),
    SkillBuilderPlugin(input),
    MemoryToolsPlugin(input),
    OhcPlugin(input),
    UpdaterPlugin(input),
  ])

  const merged = {}

  if (bootstrap.config) merged.config = bootstrap.config

  const toolHandlers = { ...memoryTools.tool, ...ohc.tool }
  if (Object.keys(toolHandlers).length) merged.tool = toolHandlers

  merged["experimental.chat.system.transform"] = chain(ohc["experimental.chat.system.transform"])
  merged["experimental.chat.messages.transform"] = chain(
    bootstrap["experimental.chat.messages.transform"],
    ohc["experimental.chat.messages.transform"],
  )
  merged["command.execute.before"] = chain(updater["command.execute.before"], ohc["command.execute.before"])

  const eventHandlers = [autorecall.event, curator.event, skillBuilder.event].filter(Boolean)
  if (eventHandlers.length) {
    merged.event = async (payload) => {
      await Promise.all(eventHandlers.map(fn => fn(payload)))
    }
  }

  for (const hook of ["experimental.session.compacting", "tool.execute.after"]) {
    const handler = chain(curator[hook], skillBuilder[hook])
    if (handler) merged[hook] = handler
  }

  return merged
}
