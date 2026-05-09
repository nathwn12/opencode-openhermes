import { getLastUserMessage } from "../messages/query.js";
import { findLastCompactionTimestamp } from "./utils.js";
function resetTransientSessionState(state, lastCompactionTimestamp) {
    state.isSubAgent = false;
    state.manualMode = false;
    state.pendingManualTrigger = null;
    state.compressPermission = undefined;
    state.modelContextLimit = null;
    state.refCounter = 0;
    state.lastUserTurnIndex = -1;
    state.turnCounter = 0;
    state.toolCache = {};
    state.cachedMessages = null;
    state.toolIdList = [];
    state.rawIdToRef.clear();
    state.refToRawId.clear();
    state.messageIds.clear();
    state.compressionTiming.startsByCallId.clear();
    state.compressionTiming.pendingByCallId.clear();
    state.compressionTiming.durationsByBlockId.clear();
    if (state.prune) {
        state.prune.messages.byMessageId.clear();
        state.prune.messages.blocksById.clear();
        state.prune.messages.activeBlockIds.clear();
        state.prune.tools.clear();
    }
    if (state.nudges) {
        state.nudges.contextLimitAnchors.clear();
        state.nudges.turnNudgeAnchors.clear();
        state.nudges.iterationNudgeAnchors.clear();
    }
    state.lastCompaction = lastCompactionTimestamp;
}
function resetOnCompaction(state, lastCompactionTimestamp) {
    resetTransientSessionState(state, lastCompactionTimestamp);
}
export function checkSession(state, logger, messages) {
    const lastUserMessage = getLastUserMessage(messages);
    if (!lastUserMessage)
        return;
    const lastSessionId = lastUserMessage.info?.sessionID;
    if (!lastSessionId)
        return;
    const lastCompactionTimestamp = findLastCompactionTimestamp(messages);
    if (state.sessionId === null || state.sessionId !== lastSessionId) {
        logger.info(`Session changed: ${state.sessionId} -> ${lastSessionId}`);
        resetTransientSessionState(state, lastCompactionTimestamp);
        state.sessionId = lastSessionId;
    }
    if (lastCompactionTimestamp > state.lastCompaction) {
        logger.info("Detected compaction, resetting prune state", { timestamp: lastCompactionTimestamp });
        resetOnCompaction(state, lastCompactionTimestamp);
    }
}
export function ensureSessionInitialized(client, state, sessionId, logger, messages) {
    if (state.sessionId === sessionId)
        return;
    state.sessionId = sessionId;
    logger.info("Session initialized", { sessionId });
}
//# sourceMappingURL=index.js.map