import type { SessionState } from "../state.js";
export declare function isMessageCompacted(state: SessionState, msg: Record<string, unknown>): boolean;
export declare function findLastCompactionTimestamp(messages: unknown[]): number;
export declare function getActiveSummaryTokenUsage(state: SessionState): number;
export declare function countTurns(state: SessionState, messages: unknown[]): number;
//# sourceMappingURL=utils.d.ts.map