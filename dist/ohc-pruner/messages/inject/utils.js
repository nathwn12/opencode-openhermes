import { appendToTextPart, appendToLastTextPart, createSyntheticTextPart, hasContent, } from "../utils.js";
import { getLastUserMessage, isIgnoredUserMessage } from "../query.js";
import { getMessageId, getRole } from "../index.js";
export function getNudgeFrequency(config) {
    return Math.max(1, Math.floor(config.compress.nudgeFrequency || 1));
}
export function getIterationNudgeThreshold(config) {
    return Math.max(1, Math.floor(config.compress.iterationNudgeThreshold || 1));
}
export function findLastNonIgnoredMessage(messages) {
    for (let i = messages.length - 1; i >= 0; i--) {
        const message = messages[i];
        if (isIgnoredUserMessage(message))
            continue;
        return { message, index: i };
    }
    return null;
}
export function countMessagesAfterIndex(messages, index) {
    let count = 0;
    for (let i = index + 1; i < messages.length; i++) {
        const message = messages[i];
        if (isIgnoredUserMessage(message))
            continue;
        count++;
    }
    return count;
}
export function getModelInfo(messages) {
    const lastUserMessage = getLastUserMessage(messages);
    if (!lastUserMessage) {
        return { providerId: undefined, modelId: undefined };
    }
    const userInfo = lastUserMessage.info;
    return {
        providerId: userInfo?.model?.providerID,
        modelId: userInfo?.model?.modelID,
    };
}
function resolveContextTokenLimit(config, state, providerId, modelId, threshold) {
    const parseLimitValue = (limit) => {
        if (limit === undefined)
            return undefined;
        if (typeof limit === "number")
            return limit;
        if (!limit.endsWith("%") || state.modelContextLimit === null)
            return undefined;
        const parsedPercent = parseFloat(limit.slice(0, -1));
        if (isNaN(parsedPercent))
            return undefined;
        const clampedPercent = Math.max(0, Math.min(100, Math.round(parsedPercent)));
        return Math.round((clampedPercent / 100) * state.modelContextLimit);
    };
    const modelLimits = threshold === "max" ? config.compress.modelMaxLimits : config.compress.modelMinLimits;
    if (modelLimits && providerId !== undefined && modelId !== undefined) {
        const providerModelId = `${providerId}/${modelId}`;
        const modelLimit = modelLimits[providerModelId];
        if (modelLimit !== undefined)
            return parseLimitValue(modelLimit);
    }
    const globalLimit = threshold === "max" ? config.compress.maxContextLimit : config.compress.minContextLimit;
    return parseLimitValue(globalLimit);
}
export function isContextOverLimits(config, state, providerId, modelId, messages) {
    const maxContextLimit = resolveContextTokenLimit(config, state, providerId, modelId, "max");
    const minContextLimit = resolveContextTokenLimit(config, state, providerId, modelId, "min");
    let currentTokens = 0;
    for (const msg of messages) {
        const parts = Array.isArray(msg.parts) ? msg.parts : [];
        for (const part of parts) {
            if (part.type === "text")
                currentTokens += Math.ceil((part.text || "").length / 4);
            else if (part.type === "tool")
                currentTokens += 50;
        }
    }
    const overMaxLimit = maxContextLimit === undefined ? false : currentTokens > maxContextLimit;
    const overMinLimit = minContextLimit === undefined ? true : currentTokens >= minContextLimit;
    return { overMaxLimit, overMinLimit };
}
export function addAnchor(anchorMessageIds, anchorMessageId, anchorMessageIndex, messages, interval) {
    if (anchorMessageIndex < 0)
        return false;
    let latestAnchorMessageIndex = -1;
    for (let i = messages.length - 1; i >= 0; i--) {
        const id = getMessageId(messages[i]);
        if (id && anchorMessageIds.has(id)) {
            latestAnchorMessageIndex = i;
            break;
        }
    }
    const shouldAdd = latestAnchorMessageIndex < 0 || anchorMessageIndex - latestAnchorMessageIndex >= interval;
    if (!shouldAdd)
        return false;
    const previousSize = anchorMessageIds.size;
    if (anchorMessageIds instanceof Map) {
        anchorMessageIds.set(anchorMessageId, anchorMessageIndex);
    }
    else {
        anchorMessageIds.add(anchorMessageId);
    }
    return anchorMessageIds.size !== previousSize;
}
function injectAnchoredNudge(message, nudgeText) {
    if (!nudgeText.trim())
        return;
    const role = getRole(message);
    if (role === "user") {
        if (appendToLastTextPart(message, nudgeText))
            return;
        const parts = Array.isArray(message.parts) ? message.parts : [];
        parts.push(createSyntheticTextPart(message, nudgeText));
        message.parts = parts;
        return;
    }
    if (role !== "assistant")
        return;
    if (!hasContent(message))
        return;
    const parts = Array.isArray(message.parts) ? message.parts : [];
    for (const part of parts) {
        if (part.type === "text") {
            if (appendToTextPart(part, nudgeText))
                return;
        }
    }
    const syntheticPart = createSyntheticTextPart(message, nudgeText);
    const firstToolIndex = parts.findIndex((p) => p.type === "tool");
    if (firstToolIndex === -1) {
        parts.push(syntheticPart);
    }
    else {
        parts.splice(firstToolIndex, 0, syntheticPart);
    }
    message.parts = parts;
}
function collectAnchoredMessages(anchorMessageIds, messages) {
    const anchoredMessages = [];
    for (const anchorMessageId of anchorMessageIds.keys()) {
        const index = messages.findIndex(m => getMessageId(m) === anchorMessageId);
        if (index === -1)
            continue;
        anchoredMessages.push({ message: messages[index], index });
    }
    return anchoredMessages;
}
function collectTurnNudgeAnchors(state, config, messages) {
    const turnNudgeAnchors = new Map();
    const targetRole = config.compress.nudgeForce === "strong" ? "user" : "assistant";
    const nudges = state.nudges;
    for (const message of messages) {
        const m = message;
        const mid = getMessageId(m);
        if (!mid || !nudges.turnNudgeAnchors.has(mid))
            continue;
        if (getRole(m) === targetRole)
            turnNudgeAnchors.set(mid, 0);
    }
    return turnNudgeAnchors;
}
function applyRangeModeAnchoredNudge(anchorMessageIds, messages, baseNudgeText) {
    for (const { message } of collectAnchoredMessages(anchorMessageIds, messages)) {
        injectAnchoredNudge(message, baseNudgeText);
    }
}
function applyMessageModeAnchoredNudge(anchorMessageIds, messages, baseNudgeText, compressionPriorities) {
    for (const { message } of collectAnchoredMessages(anchorMessageIds, messages)) {
        injectAnchoredNudge(message, baseNudgeText);
    }
}
export function applyAnchoredNudges(state, config, messages, compressionPriorities, nudges) {
    const turnNudgeAnchors = collectTurnNudgeAnchors(state, config, messages);
    const nudgeState = state.nudges;
    const ctxNudge = nudges?.contextLimitNudge ?? "";
    const turnNudgeText = nudges?.turnNudge ?? "";
    const iterNudgeText = nudges?.iterationNudge ?? "";
    if (config.compress.mode === "message") {
        applyMessageModeAnchoredNudge(nudgeState.contextLimitAnchors, messages, ctxNudge, compressionPriorities);
        applyMessageModeAnchoredNudge(turnNudgeAnchors, messages, turnNudgeText, compressionPriorities);
        applyMessageModeAnchoredNudge(nudgeState.iterationNudgeAnchors, messages, iterNudgeText, compressionPriorities);
        return;
    }
    applyRangeModeAnchoredNudge(nudgeState.contextLimitAnchors, messages, ctxNudge);
    applyRangeModeAnchoredNudge(turnNudgeAnchors, messages, turnNudgeText);
    applyRangeModeAnchoredNudge(nudgeState.iterationNudgeAnchors, messages, iterNudgeText);
}
//# sourceMappingURL=utils.js.map