export declare function hasProtectedTags(text: string): boolean;
export declare function extractProtectedText(text: string): string[];
interface SearchContext {
    messageById?: Map<string, unknown>;
    summaryByBlockId?: Map<string, string>;
    cwd?: string;
}
export declare function appendProtectedUserMessages(summary: string, selection: {
    messageIds: string[];
}, searchContext: {
    messageById: Map<string, unknown>;
}, config: {
    protectUserMessages?: boolean;
}): string;
export declare function appendProtectedPromptInfo(summary: string, selection: {
    messageIds: string[];
}, searchContext: {
    messageById: Map<string, unknown>;
}, config: {
    protectTags?: boolean;
}): string;
export declare function appendProtectedTools(client: unknown, config: {
    compress?: {
        protectedTools?: string[];
    };
    protectedFilePatterns?: string[];
}, summary: string, selection: {
    messageIds: string[];
}, searchContext: SearchContext): Promise<string>;
export {};
//# sourceMappingURL=protected-content.d.ts.map