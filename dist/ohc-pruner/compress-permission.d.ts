import type { SessionState } from "./state.js";
import type { PluginConfig, Permission } from "./config.js";
import type { HostPermissionSnapshot } from "./host-permissions.js";
export declare function compressPermission(state: SessionState, config: PluginConfig): Permission;
export declare function syncCompressPermissionState(state: SessionState, config: PluginConfig, hostPermissions: HostPermissionSnapshot | undefined, messages: unknown[]): Permission;
//# sourceMappingURL=compress-permission.d.ts.map