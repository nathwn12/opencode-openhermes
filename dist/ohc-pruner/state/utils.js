import { isMessageWithInfo } from "../messages/shape.js";
import { getMessageId } from "../messages/index.js";
export function isMessageCompacted(state, msg) {
    const msgId = getMessageId(msg);
    if (!msgId)
        return false;
    const pruneMessages = state.prune?.messages;
    if (pruneMessages) {
        const entry = pruneMessages.byMessageId.get(msgId);
        if (entry && entry.activeBlockIds.length > 0)
            return true;
    }
    return state.blocks.some(b => b.messageIds?.includes(msgId));
}
export function findLastCompactionTimestamp(messages) {
    for (let i = messages.length - 1; i >= 0; i--) {
        const msg = messages[i];
        if (!isMessageWithInfo(msg))
            continue;
        const info = msg.info;
        if (info.role === "assistant" && info.summary === true) {
            return info.time?.created || 0;
        }
    }
    return 0;
}
export function getActiveSummaryTokenUsage(state) {
    let total = 0;
    for (const block of state.blocks) {
        if (block.appliedAt !== null) {
            total += block.summaryTokens || 0;
        }
    }
    return total;
}
export function countTurns(state, messages) {
    let turnCount = 0;
    for (const msg of messages) {
        const m = msg;
        if (isMessageCompacted(state, m))
            continue;
        const parts = Array.isArray(m.parts) ? m.parts : [];
        for (const part of parts) {
            if (part.type === "step-start")
                turnCount++;
        }
    }
    return turnCount;
}
//# sourceMappingURL=utils.js.map