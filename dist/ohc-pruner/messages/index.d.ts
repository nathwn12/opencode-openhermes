import type { SessionState } from "../state.js";
import type { PluginConfig } from "../config.js";
export declare function getMessageId(msg: Record<string, unknown>): string;
export declare function setMessageId(msg: Record<string, unknown>, id: string): void;
export declare function getRole(msg: Record<string, unknown>): string;
export declare function isUserTurn(messages: unknown[]): boolean;
export declare function sinceLastUser(messages: unknown[]): number;
export declare function isSubAgentSession(messages: unknown[]): boolean;
export declare function assignMessageRefs(state: SessionState, messages: unknown[]): void;
export declare function injectMessageIds(state: SessionState, messages: unknown[]): void;
export interface ToolIdEntry {
    id: string;
    partIndex: number;
    toolName: string;
    status: string;
}
export declare function buildToolIdList(state: SessionState, messages: unknown[]): void;
export declare function deduplicateToolCalls(messages: unknown[], config: PluginConfig): number;
export declare function purgeErroredToolInputs(messages: unknown[], config: PluginConfig): number;
export declare function syncCompressionBlocks(state: SessionState, messages: unknown[], config?: PluginConfig): void;
export declare function buildCompressionNudge(tokens: number, maxContextLimit: number, mode: string, sinceLastUserCount: number): string;
export declare function makeNudgeId(tokens: number, maxContextLimit: number, mode: string, iterationCount: number): string;
export declare function buildSystemPromptExtension(config: PluginConfig, modelContextLimit: number): string;
export declare function totalTokens(messages: unknown[]): number;
export declare function filterShape(messages: unknown[]): unknown[];
//# sourceMappingURL=index.d.ts.map