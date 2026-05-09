import { getLastUserMessage } from "./query.js";
export function stripStaleMetadata(messages) {
    const lastUserMessage = getLastUserMessage(messages);
    if (!lastUserMessage)
        return;
    const info = lastUserMessage.info;
    if (!info)
        return;
    const modelID = info.modelID;
    const providerID = info.providerID;
    for (const message of messages) {
        const m = message;
        const msgInfo = m.info;
        if (!msgInfo || msgInfo.role !== "assistant")
            continue;
        if (msgInfo.modelID === modelID && msgInfo.providerID === providerID)
            continue;
        const parts = Array.isArray(m.parts) ? m.parts : [];
        m.parts = parts.map((part) => {
            if (part.type !== "text" && part.type !== "tool" && part.type !== "reasoning")
                return part;
            if (!("metadata" in part))
                return part;
            const { metadata: _metadata, ...rest } = part;
            return rest;
        });
    }
}
//# sourceMappingURL=reasoning-strip.js.map