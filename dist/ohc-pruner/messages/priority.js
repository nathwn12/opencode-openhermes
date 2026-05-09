import { isIgnoredUserMessage, isProtectedUserMessage, messageHasCompress } from "./query.js";
import { getMessageId } from "./index.js";
const MEDIUM_PRIORITY_MIN_TOKENS = 500;
const HIGH_PRIORITY_MIN_TOKENS = 5000;
function countAllMessageTokens(msg) {
    const parts = Array.isArray(msg.parts) ? msg.parts : [];
    let total = 0;
    for (const part of parts) {
        if (part.type === "text") {
            total += Math.ceil((part.text || "").length / 4);
        }
        else if (part.type === "tool") {
            total += 50;
            if (part.state?.output && typeof part.state.output === "string") {
                total += Math.ceil(part.state.output.length / 4);
            }
        }
    }
    return total;
}
export function buildPriorityMap(config, state, messages) {
    if (config.compress.mode !== "message")
        return new Map();
    const priorities = new Map();
    for (const message of messages) {
        const msg = message;
        if (isIgnoredUserMessage(msg))
            continue;
        if (isProtectedUserMessage(config, msg))
            continue;
        const rawMessageId = msg.info?.id;
        if (typeof rawMessageId !== "string" || rawMessageId.length === 0)
            continue;
        const ref = getMessageId(msg);
        if (!ref)
            continue;
        const tokenCount = countAllMessageTokens(msg);
        priorities.set(rawMessageId, {
            ref,
            tokenCount,
            priority: messageHasCompress(msg) ? "high" : classifyMessagePriority(tokenCount),
        });
    }
    return priorities;
}
export function classifyMessagePriority(tokenCount) {
    if (tokenCount >= HIGH_PRIORITY_MIN_TOKENS)
        return "high";
    if (tokenCount >= MEDIUM_PRIORITY_MIN_TOKENS)
        return "medium";
    return "low";
}
export function listPriorityRefsBeforeIndex(messages, priorities, anchorIndex, priority) {
    const refs = [];
    const seen = new Set();
    const upperBound = Math.max(0, Math.min(anchorIndex, messages.length));
    for (let index = 0; index < upperBound; index++) {
        const msg = messages[index];
        const rawMessageId = msg.info?.id;
        if (typeof rawMessageId !== "string")
            continue;
        const entry = priorities.get(rawMessageId);
        if (!entry || entry.priority !== priority || seen.has(entry.ref))
            continue;
        seen.add(entry.ref);
        refs.push(entry.ref);
    }
    return refs;
}
//# sourceMappingURL=priority.js.map