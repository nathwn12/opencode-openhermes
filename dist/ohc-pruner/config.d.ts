export type Permission = "ask" | "allow" | "deny";
export type CompressMode = "range" | "message";
export interface CompressConfig {
    mode: CompressMode;
    permission: Permission;
    showCompression: boolean;
    summaryBuffer: boolean;
    maxContextLimit: number | `${number}%`;
    minContextLimit: number | `${number}%`;
    modelMaxLimits?: Record<string, number | `${number}%`>;
    modelMinLimits?: Record<string, number | `${number}%`>;
    nudgeFrequency: number;
    iterationNudgeThreshold: number;
    nudgeForce: "strong" | "soft";
    protectedTools: string[];
    protectTags: boolean;
    protectUserMessages: boolean;
}
export interface CommandsConfig {
    enabled: boolean;
    protectedTools: string[];
}
export interface ManualModeConfig {
    enabled: boolean;
    automaticStrategies: boolean;
}
export interface PurgeErrorsConfig {
    enabled: boolean;
    turns: number;
    protectedTools: string[];
}
export interface TurnProtectionConfig {
    enabled: boolean;
    turns: number;
}
export interface ExperimentalConfig {
    allowSubAgents: boolean;
    customPrompts: boolean;
}
export interface PluginConfig {
    enabled: boolean;
    autoUpdate: boolean;
    debug: boolean;
    pruneNotification: "off" | "minimal" | "detailed";
    pruneNotificationType: "chat" | "toast";
    commands: CommandsConfig;
    manualMode: ManualModeConfig;
    turnProtection: TurnProtectionConfig;
    experimental: ExperimentalConfig;
    protectedFilePatterns: string[];
    compress: CompressConfig;
    strategies: {
        deduplication: PurgeErrorsConfig;
        purgeErrors: PurgeErrorsConfig;
    };
}
export declare const DEFAULT_CONFIG: PluginConfig;
export declare function loadConfig(cwd: string, client: {
    tui?: {
        showToast?: (opts: unknown) => Promise<unknown>;
    };
}): PluginConfig;
export declare function resolveLimit(limit: number | `${number}%` | undefined, modelLimit: number | null, fallback: number): number;
export declare function getEffectiveLimit(config: PluginConfig, modelLimit: number | null, field: "maxContextLimit" | "minContextLimit"): number;
//# sourceMappingURL=config.d.ts.map