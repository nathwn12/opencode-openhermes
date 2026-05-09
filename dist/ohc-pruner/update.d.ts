export declare function isAutoUpdatableSpec(spec: string): boolean;
export declare function isVersionNewer(latest: string, current: string): boolean;
export declare function checkAutoUpdate(signal?: AbortSignal): Promise<string | null>;
export declare function startAutoUpdate(client: unknown, enabled: boolean): Promise<void>;
//# sourceMappingURL=update.d.ts.map