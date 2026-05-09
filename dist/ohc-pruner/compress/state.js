export function attachCompressionDuration(state, messageId, callId, durationMs) {
    if (typeof durationMs !== "number" || !Number.isFinite(durationMs))
        return 0;
    let updates = 0;
    for (const block of state.blocks) {
        if (block.compressMessageId !== messageId || block.compressCallId !== callId)
            continue;
        state.compressionTiming.durationsByBlockId.set(block.id, durationMs);
        updates++;
    }
    return updates;
}
//# sourceMappingURL=state.js.map