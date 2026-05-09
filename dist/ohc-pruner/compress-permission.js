import { compressDisabledByOpencode, resolveEffectiveCompressPermission } from "./host-permissions.js";
export function compressPermission(state, config) {
    if (state.compressPermission !== undefined)
        return state.compressPermission;
    return config.compress.permission;
}
export function syncCompressPermissionState(state, config, hostPermissions, messages) {
    if (!messages || messages.length === 0)
        return config.compress.permission;
    const firstMsg = messages[0];
    const systemText = Array.isArray(firstMsg?.parts)
        ? firstMsg.parts.filter(p => p.type === "text").map(p => p.text).join("\n")
        : "";
    let agentName;
    if (systemText.includes("You are a title generator")) {
        agentName = "title-generator";
    }
    else if (systemText.includes("subagent") || systemText.includes("You are a")) {
        agentName = "subagent";
    }
    if (compressDisabledByOpencode({ compress: config.compress.permission })) {
        state.compressPermission = "deny";
        return "deny";
    }
    const effectivePermission = resolveEffectiveCompressPermission(config.compress.permission, hostPermissions, agentName);
    state.compressPermission = effectivePermission;
    return effectivePermission;
}
//# sourceMappingURL=compress-permission.js.map