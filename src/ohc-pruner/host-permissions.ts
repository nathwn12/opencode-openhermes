import type { Permission } from "./config.js"

export interface HostPermissionSnapshot {
  global?: Permission
  agents?: Record<string, Permission | { compress: Permission }>
}

export function compressDisabledByOpencode(...permissionConfigs: Array<{ compress?: Permission }>): boolean {
  for (const cfg of permissionConfigs) {
    if (cfg.compress === "deny") return true
  }
  return false
}

export function resolveEffectiveCompressPermission(
  basePermission: Permission,
  hostPermissions: HostPermissionSnapshot | undefined,
  agentName?: string,
): Permission {
  if (hostPermissions?.global && hostPermissions.global !== "ask") {
    return hostPermissions.global
  }

  if (agentName && hostPermissions?.agents?.[agentName]) {
    const agentPerm = hostPermissions.agents[agentName]
    if (typeof agentPerm === "object" && agentPerm.compress) {
      if (agentPerm.compress === "deny" || agentPerm.compress === "allow") {
        return agentPerm.compress
      }
    }
    if (agentPerm === "allow" || agentPerm === "deny") {
      return agentPerm
    }
  }

  return basePermission
}

export function hasExplicitToolPermission(
  permissionConfig: { tools?: Array<{ tool: string; permission: Permission }> },
  tool: string,
): boolean {
  if (!Array.isArray(permissionConfig.tools)) return false
  return permissionConfig.tools.some(t => t.tool === tool)
}
