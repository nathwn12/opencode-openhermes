import type { Permission } from "./config.js";
export declare const COMPRESSED_BLOCK_HEADER = "ohc-summary";
export interface CompressionTimingEntry {
    messageId: string | null;
    callId: string | null;
    durationMs: number;
}
export interface CompressionBlock {
    id: string;
    runId: number;
    topic: string;
    batchTopic: string;
    startId: string;
    endId: string;
    mode: string;
    summary: string;
    summaryTokens: number;
    compressMessageId: string | null;
    compressCallId: string | null;
    anchorMessageId: string;
    messageIds: string[];
    consumedBlockIds: string[];
    createdAt: number;
    appliedAt: number | null;
    deactivatedAt: number | null;
    active?: boolean;
    deactivatedByUser?: boolean;
    deactivatedByBlockId?: string;
}
export interface CompressionTimingState {
    startsByCallId: Map<string, number>;
    pendingByCallId: Map<string, CompressionTimingEntry>;
    durationsByBlockId: Map<string, number>;
}
export interface SessionStats {
    totalCompressed: number;
    totalSavedTokens: number;
    compressionCount: number;
    dedupCount: number;
    purgeCount: number;
}
export interface SessionState {
    sessionId: string | null;
    isSubAgent: boolean;
    manualMode: boolean | "active" | "compress-pending";
    pendingManualTrigger: {
        sessionId: string;
        prompt: string;
    } | null;
    modelContextLimit: number | null;
    refCounter: number;
    compressionRunCounter: number;
    lastUserTurnIndex: number;
    turnCounter: number;
    lastCompaction: number;
    blocks: CompressionBlock[];
    blockIdCounter: number;
    decompressedBlocks: CompressionBlock[];
    toolCache: Record<string, unknown>;
    toolIdList: Array<{
        id: string;
        partIndex: number;
        toolName: string;
        status: string;
    }>;
    messageIds: Map<string, unknown>;
    rawIdToRef: Map<string, string>;
    refToRawId: Map<string, string>;
    cachedMessages: unknown[] | null;
    compressPermission: Permission | undefined;
    compressionTiming: CompressionTimingState;
    stats: SessionStats;
    prune?: {
        messages: {
            byMessageId: Map<string, unknown>;
            blocksById: Map<string, CompressionBlock>;
            activeBlockIds: Set<string>;
        };
        tools: Map<string, number>;
    };
    nudges?: {
        contextLimitAnchors: Map<string, number>;
        turnNudgeAnchors: Map<string, number>;
        iterationNudgeAnchors: Set<string>;
    };
}
export declare function createSessionState(): SessionState;
export declare function allocateBlockId(state: SessionState): string;
export declare function allocateRunId(state: SessionState): number;
export declare function allocateMessageRef(state: SessionState): string;
export declare function wrapCompressedSummary(blockId: string, summary: string): string;
export interface PruneEntry {
    allBlockIds: string[];
    activeBlockIds: string[];
}
export declare function applyCompressionState(state: SessionState, meta: {
    topic: string;
    batchTopic?: string;
    startId: string;
    endId: string;
    mode?: string;
    runId: number;
    compressMessageId?: string | null;
    compressCallId?: string | null;
    summaryTokens?: number;
}, selection: {
    messageIds: string[];
}, anchorMessageId: string, blockId: string, storedSummary: string, consumedBlockIds: string[]): CompressionBlock;
export declare function findBlockByMessageId(state: SessionState, messageId: string): CompressionBlock | undefined;
export declare function findBlockById(state: SessionState, blockId: string): CompressionBlock | undefined;
export declare function decompressBlock(state: SessionState, blockId: string): CompressionBlock | null;
export declare function recompressBlock(state: SessionState, blockId: string): CompressionBlock | null;
export declare function findRecompressibleBlocks(state: SessionState): CompressionBlock[];
export declare function loadState(cwd: string): Record<string, unknown>;
export declare function saveState(cwd: string): void;
export declare function syncBlockToState(state: SessionState, cwd: string): void;
//# sourceMappingURL=state.d.ts.map