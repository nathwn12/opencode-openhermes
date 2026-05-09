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
export declare function createCompressMessageTool(pluginContext: PluginToolContext): {
    description: string;
    args: {
        topic: import("zod").ZodString;
        content: import("zod").ZodArray<import("zod").ZodObject<{
            messageId: import("zod").ZodString;
            summary: import("zod").ZodString;
        }, import("zod/v4/core").$strip>>;
    };
    execute(args: {
        topic: string;
        content: {
            messageId: string;
            summary: string;
        }[];
    }, context: import("@opencode-ai/plugin").ToolContext): Promise<import("@opencode-ai/plugin").ToolResult>;
};
export {};
//# sourceMappingURL=message.d.ts.map