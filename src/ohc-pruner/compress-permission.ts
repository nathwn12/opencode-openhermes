import type { SessionState } from "./state.js"
import type { PluginConfig, Permission } from "./config.js"
import { compressDisabledByOpencode, resolveEffectiveCompressPermission } from "./host-permissions.js"
import type { HostPermissionSnapshot } from "./host-permissions.js"

export function compressPermission(state: SessionState, config: PluginConfig): Permission {
  if (state.compressPermission !== undefined) return state.compressPermission
  return config.compress.permission
}

export function syncCompressPermissionState(
  state: SessionState,
  config: PluginConfig,
  hostPermissions: HostPermissionSnapshot | undefined,
  messages: unknown[],
): Permission {
  if (!messages || messages.length === 0) return config.compress.permission

  const firstMsg = messages[0] as Record<string, unknown> | undefined
  const systemText = Array.isArray(firstMsg?.parts)
    ? (firstMsg.parts as Array<Record<string, unknown>>).filter(p => p.type === "text").map(p => p.text as string).join("\n")
    : ""

  let agentName: string | undefined
  if (systemText.includes("You are a title generator")) {
    agentName = "title-generator"
  } else if (systemText.includes("subagent") || systemText.includes("You are a")) {
    agentName = "subagent"
  }

  if (compressDisabledByOpencode({ compress: config.compress.permission })) {
    state.compressPermission = "deny"
    return "deny"
  }

  const effectivePermission = resolveEffectiveCompressPermission(config.compress.permission, hostPermissions, agentName)
  state.compressPermission = effectivePermission
  return effectivePermission
}
