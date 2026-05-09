import type { SessionState } from "../state.js";
export interface SearchContext {
    rawMessages: unknown[];
    rawMessagesById: Map<string, unknown>;
    rawIndexById: Map<string, number>;
    summaryByBlockId: Map<string, unknown>;
}
export declare function buildSearchContext(state: SessionState, rawMessages: unknown[]): SearchContext;
export declare function resolveMessageIndexById(state: SessionState, messages: unknown[], id: string): number | null;
//# sourceMappingURL=search.d.ts.map