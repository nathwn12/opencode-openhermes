export function compressDisabledByOpencode(...permissionConfigs) {
    for (const cfg of permissionConfigs) {
        if (cfg.compress === "deny")
            return true;
    }
    return false;
}
export function resolveEffectiveCompressPermission(basePermission, hostPermissions, agentName) {
    if (hostPermissions?.global && hostPermissions.global !== "ask") {
        return hostPermissions.global;
    }
    if (agentName && hostPermissions?.agents?.[agentName]) {
        const agentPerm = hostPermissions.agents[agentName];
        if (typeof agentPerm === "object" && agentPerm.compress) {
            if (agentPerm.compress === "deny" || agentPerm.compress === "allow") {
                return agentPerm.compress;
            }
        }
        if (agentPerm === "allow" || agentPerm === "deny") {
            return agentPerm;
        }
    }
    return basePermission;
}
export function hasExplicitToolPermission(permissionConfig, tool) {
    if (!Array.isArray(permissionConfig.tools))
        return false;
    return permissionConfig.tools.some(t => t.tool === tool);
}
//# sourceMappingURL=host-permissions.js.map