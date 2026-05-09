import { createHash } from "node:crypto";
const SUMMARY_ID_HASH_LENGTH = 16;
const OHC_BLOCK_ID_TAG_REGEX = /(<ohc-message-id(?=[\s>])[^>]*>)b\d+(<\/ohc-message-id>)/g;
const OHC_PAIRED_TAG_REGEX = /<ohc[^>]*>[\s\S]*?<\/ohc[^>]*>/gi;
const OHC_UNPAIRED_TAG_REGEX = /<\/?ohc[^>]*>/gi;
function generateStableId(prefix, seed) {
    const hash = createHash("sha256").update(seed).digest("hex").slice(0, SUMMARY_ID_HASH_LENGTH);
    return `${prefix}_${hash}`;
}
export function createSyntheticUserMessage(baseMessage, content, stableSeed) {
    const info = (baseMessage.info ?? {});
    const now = Date.now();
    const deterministicSeed = stableSeed?.trim() || info.id || "";
    const messageId = generateStableId("msg_ohc_summary", deterministicSeed);
    const partId = generateStableId("prt_ohc_summary", deterministicSeed);
    return {
        info: {
            id: messageId,
            ohcRef: messageId,
            sessionID: info.sessionID,
            role: "user",
            time: { created: now },
        },
        parts: [
            {
                id: partId,
                sessionID: info.sessionID,
                messageID: messageId,
                type: "text",
                text: content,
            },
        ],
    };
}
export function createSyntheticTextPart(baseMessage, content, stableSeed) {
    const info = (baseMessage.info ?? {});
    const deterministicSeed = stableSeed?.trim() || info.id || "";
    const partId = generateStableId("prt_ohc_text", deterministicSeed);
    return {
        id: partId,
        sessionID: info.sessionID,
        messageID: info.id,
        type: "text",
        text: content,
    };
}
export function appendToTextPart(part, injection) {
    if (typeof part.text !== "string")
        return false;
    const normalizedInjection = injection.replace(/^\n+/, "");
    if (!normalizedInjection.trim())
        return false;
    if (part.text.includes(normalizedInjection))
        return true;
    const baseText = part.text.replace(/\n*$/, "");
    part.text = baseText.length > 0 ? `${baseText}\n\n${normalizedInjection}` : normalizedInjection;
    return true;
}
export function appendToLastTextPart(message, injection) {
    const parts = Array.isArray(message.parts) ? message.parts : [];
    for (let i = parts.length - 1; i >= 0; i--) {
        if (parts[i].type === "text")
            return appendToTextPart(parts[i], injection);
    }
    return false;
}
export function appendToToolPart(part, tag) {
    if (part.state?.status !== "completed" || typeof part.state.output !== "string")
        return false;
    if (part.state.output.includes(tag))
        return true;
    part.state.output = `${part.state.output}${tag}`;
    return true;
}
export function appendToAllToolParts(message, tag) {
    let injected = false;
    const parts = Array.isArray(message.parts) ? message.parts : [];
    for (const part of parts) {
        if (part.type === "tool")
            injected = appendToToolPart(part, tag) || injected;
    }
    return injected;
}
export function hasContent(message) {
    const parts = Array.isArray(message.parts) ? message.parts : [];
    return parts.some((part) => (part.type === "text" && typeof part.text === "string" && part.text.trim().length > 0) ||
        (part.type === "tool" && part.state?.status === "completed" && typeof part.state.output === "string"));
}
export function buildToolIdList(state, messages) {
    const toolIds = [];
    for (const msg of messages) {
        const parts = Array.isArray(msg.parts) ? msg.parts : [];
        for (const part of parts) {
            if (part.type === "tool" && part.callID && part.tool) {
                toolIds.push(part.callID);
            }
        }
    }
    return toolIds;
}
export function stripHallucinationsFromString(text) {
    return text.replace(OHC_PAIRED_TAG_REGEX, "").replace(OHC_UNPAIRED_TAG_REGEX, "");
}
export function stripHallucinations(messages) {
    for (const message of messages) {
        const parts = Array.isArray(message.parts) ? message.parts : [];
        for (const part of parts) {
            if (part.type === "text" && typeof part.text === "string") {
                part.text = stripHallucinationsFromString(part.text);
            }
            if (part.type === "tool" && part.state?.status === "completed" && typeof part.state.output === "string") {
                part.state.output = stripHallucinationsFromString(part.state.output);
            }
        }
    }
}
//# sourceMappingURL=utils.js.map