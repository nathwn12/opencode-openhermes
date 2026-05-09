export interface PromptCollection {
    system: string;
    "compress-range": string;
    "compress-message": string;
    "context-limit-nudge": string;
    "turn-nudge": string;
    "iteration-nudge": string;
}
export declare class PromptStore {
    private overrides;
    private configDir?;
    private projectDir?;
    constructor(configDir?: string, projectDir?: string);
    reload(): void;
    ensureDefaultFiles(): void;
    getRuntimePrompts(): PromptCollection;
    get(key: keyof PromptCollection): string;
}
//# sourceMappingURL=store.d.ts.map