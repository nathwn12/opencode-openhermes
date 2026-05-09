import { getMessageId } from "../messages/index.js";
export function buildSearchContext(state, rawMessages) {
    const rawMessagesById = new Map();
    const rawIndexById = new Map();
    for (const msg of rawMessages) {
        const m = msg;
        const info = m.info;
        if (info?.id)
            rawMessagesById.set(info.id, msg);
    }
    for (let index = 0; index < rawMessages.length; index++) {
        const message = rawMessages[index];
        const info = message.info;
        if (info?.id)
            rawIndexById.set(info.id, index);
    }
    const summaryByBlockId = new Map();
    for (const block of state.blocks) {
        if (block.appliedAt !== null) {
            summaryByBlockId.set(block.id, block);
        }
    }
    return { rawMessages, rawMessagesById, rawIndexById, summaryByBlockId };
}
export function resolveMessageIndexById(state, messages, id) {
    const normalized = id.trim().toLowerCase();
    const rawId = state.refToRawId.get(normalized);
    const ref = state.rawIdToRef.get(normalized);
    const searchId = rawId || ref || normalized;
    for (let i = 0; i < messages.length; i++) {
        const mid = getMessageId(messages[i]);
        if (mid === searchId || mid === normalized)
            return i;
        const info = messages[i].info;
        if (info?.id === searchId || info?.id === normalized)
            return i;
    }
    return null;
}
//# sourceMappingURL=search.js.map