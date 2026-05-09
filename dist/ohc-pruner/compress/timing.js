import { attachCompressionDuration } from "./state.js";
export function buildCompressionTimingKey(messageId, callId) {
    return `${messageId}:${callId}`;
}
export function consumeCompressionStart(state, messageId, callId) {
    const key = buildCompressionTimingKey(messageId, callId);
    const start = state.compressionTiming.startsByCallId.get(key);
    state.compressionTiming.startsByCallId.delete(key);
    return start;
}
export function resolveCompressionDuration(startedAt, eventTime, partTime) {
    const runningAt = typeof partTime?.start === "number" && Number.isFinite(partTime.start)
        ? partTime.start
        : eventTime;
    const pendingToRunningMs = typeof startedAt === "number" && typeof runningAt === "number"
        ? Math.max(0, runningAt - startedAt)
        : undefined;
    const toolStart = partTime?.start;
    const toolEnd = partTime?.end;
    const runtimeMs = typeof toolStart === "number" &&
        Number.isFinite(toolStart) &&
        typeof toolEnd === "number" &&
        Number.isFinite(toolEnd)
        ? Math.max(0, toolEnd - toolStart)
        : undefined;
    return typeof pendingToRunningMs === "number" ? pendingToRunningMs : runtimeMs;
}
export function applyPendingCompressionDurations(state) {
    if (state.compressionTiming.pendingByCallId.size === 0)
        return 0;
    let updates = 0;
    for (const [key, entry] of state.compressionTiming.pendingByCallId) {
        const applied = attachCompressionDuration(state, entry.messageId, entry.callId, entry.durationMs);
        if (applied > 0) {
            updates += applied;
            state.compressionTiming.pendingByCallId.delete(key);
        }
    }
    return updates;
}
//# sourceMappingURL=timing.js.map