import type { SessionState } from "../state.js";
import type { Logger } from "../logger.js";
import type { PluginConfig } from "../config.js";
import type { SearchContext } from "./search.js";
export interface NotificationEntry {
    blockId: string;
    runId: number;
    summary: string;
    summaryTokens: number;
}
export interface PreparedSession {
    rawMessages: unknown[];
    searchContext: SearchContext;
}
export declare function prepareSession(state: SessionState, logger: Logger, config: PluginConfig, toolCtx: {
    sessionID: string;
}, topic: string): Promise<PreparedSession>;
export declare function finalizeSession(state: SessionState, logger: Logger, config: PluginConfig, rawMessages: unknown[], notifications: NotificationEntry[], topic: string | undefined): Promise<void>;
//# sourceMappingURL=pipeline.d.ts.map