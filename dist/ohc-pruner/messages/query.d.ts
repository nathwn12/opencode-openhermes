import type { PluginConfig } from "../config.js";
export declare function getLastUserMessage(messages: unknown[], startIndex?: number): Record<string, unknown> | null;
export declare function messageHasCompress(message: Record<string, unknown>): boolean;
export declare function isIgnoredUserMessage(message: Record<string, unknown>): boolean;
export declare function isProtectedUserMessage(config: PluginConfig, message: Record<string, unknown>): boolean;
//# sourceMappingURL=query.d.ts.map