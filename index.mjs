import { AutorecallPlugin } from "./autorecall.mjs"
import { CuratorPlugin } from "./curator.mjs"
import { SkillBuilderPlugin } from "./skill-builder.mjs"
import { BootstrapPlugin } from "./bootstrap.mjs"
import { MemoryToolsPlugin } from "./lib/memory-tools-plugin.mjs"

export default async (input) => {
  const [bootstrap, autorecall, curator, skillBuilder, memoryTools] = await Promise.all([
    BootstrapPlugin(input),
    AutorecallPlugin(input),
    CuratorPlugin(input),
    SkillBuilderPlugin(input),
    MemoryToolsPlugin(input),
  ])

  const merged = {}
  if (bootstrap.config) merged.config = bootstrap.config
  if (memoryTools.tool) merged.tool = memoryTools.tool

  const eventHandlers = [autorecall.event, curator.event, skillBuilder.event].filter(Boolean)
  if (eventHandlers.length) {
    merged.event = async (payload) => {
      await Promise.all(eventHandlers.map(fn => fn(payload)))
    }
  }

  for (const hook of ["experimental.chat.messages.transform", "experimental.session.compacting", "tool.execute.after"]) {
    const handler = bootstrap[hook] || curator[hook] || skillBuilder[hook]
    if (handler) merged[hook] = handler
  }

  return merged
}
