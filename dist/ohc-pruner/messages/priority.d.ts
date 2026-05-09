import type { PluginConfig } from "../config.js";
import type { SessionState } from "../state.js";
export type MessagePriority = "low" | "medium" | "high";
export interface CompressionPriorityEntry {
    ref: string;
    tokenCount: number;
    priority: MessagePriority;
}
export type CompressionPriorityMap = Map<string, CompressionPriorityEntry>;
export declare function buildPriorityMap(config: PluginConfig, state: SessionState, messages: unknown[]): CompressionPriorityMap;
export declare function classifyMessagePriority(tokenCount: number): MessagePriority;
export declare function listPriorityRefsBeforeIndex(messages: unknown[], priorities: CompressionPriorityMap, anchorIndex: number, priority: MessagePriority): string[];
//# sourceMappingURL=priority.d.ts.map