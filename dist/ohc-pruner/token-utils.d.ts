export declare function countTokens(text: string): number;
export declare function estimateTokensBatch(texts: string[]): number;
export declare function extractCompletedToolOutput(part: any): string | undefined;
export declare function countToolTokens(part: any): number;
export declare function countMessageTextTokens(msg: Record<string, unknown>): number;
export declare function countAllMessageTokens(msg: Record<string, unknown>): number;
export declare function getCurrentTokenUsage(messages: unknown[]): number;
//# sourceMappingURL=token-utils.d.ts.map