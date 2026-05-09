export function countTokens(text) {
    if (!text)
        return 0;
    try {
        return Math.round(text.length / 4);
    }
    catch {
        return 0;
    }
}
export function estimateTokensBatch(texts) {
    if (texts.length === 0)
        return 0;
    return countTokens(texts.join(" "));
}
function stringifyToolContent(value) {
    return typeof value === "string" ? value : JSON.stringify(value);
}
function extractToolContent(part) {
    const contents = [];
    if (part?.type !== "tool")
        return contents;
    if (part.state?.input !== undefined) {
        contents.push(stringifyToolContent(part.state.input));
    }
    if (part.state?.status === "completed" && part.state?.output !== undefined) {
        contents.push(stringifyToolContent(part.state.output));
    }
    else if (part.state?.status === "error" && part.state?.error) {
        contents.push(stringifyToolContent(part.state.error));
    }
    return contents;
}
export function extractCompletedToolOutput(part) {
    if (part?.type !== "tool" || part.state?.status !== "completed" || part.state?.output === undefined) {
        return undefined;
    }
    return stringifyToolContent(part.state.output);
}
export function countToolTokens(part) {
    const contents = extractToolContent(part);
    return estimateTokensBatch(contents);
}
export function countMessageTextTokens(msg) {
    const texts = [];
    const parts = Array.isArray(msg.parts) ? msg.parts : [];
    for (const part of parts) {
        if (part.type === "text")
            texts.push(part.text);
    }
    if (texts.length === 0)
        return 0;
    return estimateTokensBatch(texts);
}
export function countAllMessageTokens(msg) {
    const parts = Array.isArray(msg.parts) ? msg.parts : [];
    const texts = [];
    for (const part of parts) {
        if (part.type === "text") {
            texts.push(part.text);
        }
        else {
            texts.push(...extractToolContent(part));
        }
    }
    if (texts.length === 0)
        return 0;
    return estimateTokensBatch(texts);
}
export function getCurrentTokenUsage(messages) {
    let total = 0;
    for (const msg of messages) {
        total += countAllMessageTokens(msg);
    }
    return total;
}
//# sourceMappingURL=token-utils.js.map