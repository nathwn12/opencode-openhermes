interface PluginClient {
    tui?: {
        showToast?: (opts: unknown) => Promise<unknown>;
    };
    session?: {
        messages?: (opts: unknown) => Promise<unknown>;
    };
}
export declare function OHCPrunerPlugin({ client, directory }: {
    client: PluginClient;
    directory?: string;
}): Promise<Record<string, unknown>>;
declare const _default: {
    id: string;
    server: typeof OHCPrunerPlugin;
};
export default _default;
//# sourceMappingURL=ohc-pruner-core.d.ts.map