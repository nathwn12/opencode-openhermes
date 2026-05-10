import { loadConfig } from "./config.mjs"
import { reap } from "./reaper.mjs"

export const OhcPlugin = async () => {
  const config = loadConfig()
  if (!config.enabled) return {}

  const max = config.max
  const min = config.min
  if (max <= min + 10000) return {}

  return {
    "experimental.chat.messages.transform": async (_input, output) => {
      if (!output?.messages?.length) return
      reap(output.messages, max, min)
    },
  }
}