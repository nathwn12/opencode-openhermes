import { isMessageWithInfo } from "./shape.js";
import { getRole } from "./index.js";
export function getLastUserMessage(messages, startIndex) {
    const start = startIndex ?? messages.length - 1;
    for (let i = start; i >= 0; i--) {
        const msg = messages[i];
        if (!isMessageWithInfo(msg))
            continue;
        if (getRole(msg) === "user" && !isIgnoredUserMessage(msg))
            return msg;
    }
    return null;
}
export function messageHasCompress(message) {
    if (!isMessageWithInfo(message))
        return false;
    if (getRole(message) !== "assistant")
        return false;
    const parts = Array.isArray(message.parts) ? message.parts : [];
    return parts.some((part) => part.type === "tool" &&
        (part.tool === "compress" || part.name === "compress") &&
        part.state?.status === "completed");
}
export function isIgnoredUserMessage(message) {
    if (!isMessageWithInfo(message))
        return false;
    if (getRole(message) !== "user")
        return false;
    const parts = Array.isArray(message.parts) ? message.parts : [];
    if (parts.length === 0)
        return true;
    for (const part of parts) {
        if (!part.ignored)
            return false;
    }
    return true;
}
export function isProtectedUserMessage(config, message) {
    if (!isMessageWithInfo(message))
        return false;
    return (config.compress.mode === "message" &&
        config.compress.protectUserMessages &&
        getRole(message) === "user" &&
        !isIgnoredUserMessage(message));
}
//# sourceMappingURL=query.js.map