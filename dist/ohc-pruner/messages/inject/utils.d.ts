import type { SessionState } from "../../state.js";
import type { PluginConfig } from "../../config.js";
import type { CompressionPriorityMap } from "../priority.js";
export interface LastUserModelContext {
    providerId: string | undefined;
    modelId: string | undefined;
}
export interface LastNonIgnoredMessage {
    message: Record<string, unknown>;
    index: number;
}
export declare function getNudgeFrequency(config: PluginConfig): number;
export declare function getIterationNudgeThreshold(config: PluginConfig): number;
export declare function findLastNonIgnoredMessage(messages: unknown[]): LastNonIgnoredMessage | null;
export declare function countMessagesAfterIndex(messages: unknown[], index: number): number;
export declare function getModelInfo(messages: unknown[]): LastUserModelContext;
export declare function isContextOverLimits(config: PluginConfig, state: SessionState, providerId: string | undefined, modelId: string | undefined, messages: unknown[]): {
    overMaxLimit: boolean;
    overMinLimit: boolean;
};
export declare function addAnchor(anchorMessageIds: Map<string, number> | Set<string>, anchorMessageId: string, anchorMessageIndex: number, messages: unknown[], interval: number): boolean;
export declare function applyAnchoredNudges(state: SessionState, config: PluginConfig, messages: unknown[], compressionPriorities?: CompressionPriorityMap, nudges?: {
    contextLimitNudge: string;
    turnNudge: string;
    iterationNudge: string;
}): void;
//# sourceMappingURL=utils.d.ts.map