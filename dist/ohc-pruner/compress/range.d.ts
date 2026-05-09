import type { SessionState } from "../state.js";
import type { PluginConfig } from "../config.js";
interface PluginToolContext {
    client: unknown;
    state: SessionState;
    config: PluginConfig;
    cwd: string;
    searchContext?: {
        cwd: string;
    };
}
export declare function buildRangeSchema(): {
    topic: import("zod").ZodString;
    content: import("zod").ZodArray<import("zod").ZodObject<{
        startId: import("zod").ZodString;
        endId: import("zod").ZodString;
        summary: import("zod").ZodString;
    }, import("zod/v4/core").$strip>>;
};
export declare function validateArgs(input: {
    topic?: unknown;
    content?: unknown;
}): void;
export declare function createCompressRangeTool(pluginContext: PluginToolContext): {
    description: string;
    args: {
        topic: import("zod").ZodString;
        content: import("zod").ZodArray<import("zod").ZodObject<{
            startId: import("zod").ZodString;
            endId: import("zod").ZodString;
            summary: import("zod").ZodString;
        }, import("zod/v4/core").$strip>>;
    };
    execute(args: {
        topic: string;
        content: {
            startId: string;
            endId: string;
            summary: string;
        }[];
    }, context: import("@opencode-ai/plugin").ToolContext): Promise<import("@opencode-ai/plugin").ToolResult>;
};
export declare function countTokens(text: string): number;
export {};
//# sourceMappingURL=range.d.ts.map