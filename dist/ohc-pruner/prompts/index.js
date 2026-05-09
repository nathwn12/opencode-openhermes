import { buildProtectedToolsExtension, buildManualModeExtension, buildSubAgentExtension, renderSystemPromptExtensions } from "./extensions/system.js";
export function renderSystemPrompt(options) {
    const { protectedTools, manualMode, isSubAgent, customPromptsEnabled, promptStore } = options;
    let basePrompt;
    if (customPromptsEnabled && promptStore) {
        basePrompt = promptStore.get("system");
    }
    else {
        basePrompt = [
            `## OpenHermes Context Pruning (ohc-pruner)`,
            `You have access to the built-in \`compress\` tool for reducing context token usage.`,
            `When you see context-pressure notifications, use the \`compress\` tool on closed conversation segments.`,
            `Never compress active, in-progress work.`,
        ].join("\n");
    }
    const protectedExtension = protectedTools && protectedTools.length > 0
        ? buildProtectedToolsExtension(protectedTools)
        : undefined;
    const manualExtension = manualMode ? buildManualModeExtension() : undefined;
    const subAgentExtension = isSubAgent ? buildSubAgentExtension() : undefined;
    return renderSystemPromptExtensions(basePrompt, protectedExtension, manualExtension, subAgentExtension);
}
//# sourceMappingURL=index.js.map