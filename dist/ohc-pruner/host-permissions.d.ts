import type { Permission } from "./config.js";
export interface HostPermissionSnapshot {
    global?: Permission;
    agents?: Record<string, Permission | {
        compress: Permission;
    }>;
}
export declare function compressDisabledByOpencode(...permissionConfigs: Array<{
    compress?: Permission;
}>): boolean;
export declare function resolveEffectiveCompressPermission(basePermission: Permission, hostPermissions: HostPermissionSnapshot | undefined, agentName?: string): Permission;
export declare function hasExplicitToolPermission(permissionConfig: {
    tools?: Array<{
        tool: string;
        permission: Permission;
    }>;
}, tool: string): boolean;
//# sourceMappingURL=host-permissions.d.ts.map