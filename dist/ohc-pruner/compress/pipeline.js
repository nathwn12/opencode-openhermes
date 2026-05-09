import { assignMessageRefs } from "../messages/index.js";
import { buildSearchContext } from "./search.js";
import { applyPendingCompressionDurations } from "./timing.js";
export async function prepareSession(state, logger, config, toolCtx, topic) {
    if (state.manualMode && state.manualMode !== "compress-pending") {
        throw new Error("Manual mode: compress blocked. Do not retry until `<compress triggered manually>` appears in user context.");
    }
    const rawMessages = [];
    assignMessageRefs(state, rawMessages);
    return {
        rawMessages,
        searchContext: buildSearchContext(state, rawMessages),
    };
}
export async function finalizeSession(state, logger, config, rawMessages, notifications, topic) {
    state.manualMode = state.manualMode ? "active" : false;
    applyPendingCompressionDurations(state);
    logger.info("Session finalized", {
        topic,
        notificationCount: notifications.length,
    });
}
//# sourceMappingURL=pipeline.js.map