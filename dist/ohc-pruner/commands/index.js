import { totalTokens } from "../messages/index.js";
import { syncBlockToState } from "../state.js";
const MANUAL_MODE_ON = "Manual mode is now ON. Use /ohc compress to trigger context tools manually.";
const MANUAL_MODE_OFF = "Manual mode is now OFF.";
const COMPRESS_TRIGGER_PROMPT = [
    "<compress triggered manually>",
    "Manual mode trigger received. You must now use the compress tool.",
    "Find the most significant completed conversation content that can be compressed into a high-fidelity technical summary.",
    "Follow the active compress mode, preserve all critical implementation details, and choose safe targets.",
    "Return after compress with a brief explanation of what content was compressed.",
].join("\n\n");
function getTriggerPrompt(state, config, userFocus) {
    const sections = [COMPRESS_TRIGGER_PROMPT];
    if (userFocus && userFocus.trim()) {
        sections.push(`Additional user focus:\n${userFocus.trim()}`);
    }
    return sections.join("\n\n");
}
export function applyPendingManualTrigger(state, messages) {
    const pending = state.pendingManualTrigger;
    if (!pending)
        return;
    if (state.sessionId && pending.sessionId !== state.sessionId) {
        state.pendingManualTrigger = null;
        return;
    }
    for (let i = messages.length - 1; i >= 0; i--) {
        const msg = messages[i];
        if (!msg)
            continue;
        const role = msg.info?.role || msg.role || "";
        if (role !== "user")
            continue;
        if (msg.info?.ignored || msg.synthetic)
            continue;
        const parts = msg.parts;
        if (!parts)
            continue;
        for (const part of parts) {
            if (part.type !== "text" || part.ignored || part.synthetic)
                continue;
            part.text = pending.prompt;
            state.pendingManualTrigger = null;
            return;
        }
    }
    state.pendingManualTrigger = null;
}
function getActiveBlocks(state) {
    return state.blocks.filter(b => !b.deactivatedAt);
}
function getDeactivatedBlocks(state) {
    return state.blocks.filter(b => b.deactivatedAt);
}
export async function handleHelpCommand(ctx) {
    const msg = [
        "**OpenHermes OHC Commands**",
        "",
        "`/ohc` - Show this help",
        "`/ohc context` - Show token usage breakdown",
        "`/ohc stats` - Cumulative pruning statistics",
        "`/ohc sweep [n]` - Prune tools since last user message",
        "`/ohc manual [on|off]` - Toggle manual mode",
        "`/ohc compress [focus]` - Trigger compress tool",
        "`/ohc decompress [id]` - Restore a compression by block ID",
        "`/ohc recompress [id]` - Re-apply a decompressed block",
    ].join("\n");
    try {
        await ctx.client.tui?.showToast?.({ body: { title: "OHC Commands", message: msg, variant: "info", duration: 10000 } });
    }
    catch { }
}
export async function handleContextCommand(ctx) {
    const { client, state, messages } = ctx;
    const total = totalTokens(messages);
    const byRole = { system: 0, user: 0, assistant: 0, tool: 0 };
    for (const msg of messages || []) {
        const m = msg;
        const role = m.info?.role || m.role || "unknown";
        for (const part of (m.parts || [])) {
            if (part?.type === "text")
                byRole[role] += Math.ceil((part.text || "").length / 4);
            else if (part?.type === "tool")
                byRole[role] += 50;
        }
    }
    const msg = [
        "**OHC Context**",
        `Total: ~${total.toLocaleString()}`,
        `System: ~${byRole.system.toLocaleString()} | User: ~${byRole.user.toLocaleString()}`,
        `Asst: ~${byRole.assistant.toLocaleString()} | Tool: ~${byRole.tool.toLocaleString()}`,
        `Blocks: ${getActiveBlocks(state).length}`,
    ].join("\n");
    try {
        await client.tui?.showToast?.({ body: { title: "OHC Context", message: msg, variant: "info", duration: 8000 } });
    }
    catch { }
}
export async function handleStatsCommand(ctx) {
    const { client, state } = ctx;
    const s = state.stats || {};
    const msg = [
        "**OHC Stats**",
        `Compressions: ${s.compressionCount || 0}`,
        `Msgs compressed: ${s.totalCompressed || 0}`,
        `Tokens saved: ~${(s.totalSavedTokens || 0).toLocaleString()}`,
        `Dedups: ${s.dedupCount || 0} | Purges: ${s.purgeCount || 0}`,
        `Active: ${getActiveBlocks(state).length} | Deact: ${getDeactivatedBlocks(state).length}`,
    ].join("\n");
    try {
        await client.tui?.showToast?.({ body: { title: "OHC Stats", message: msg, variant: "info", duration: 8000 } });
    }
    catch { }
}
export async function handleSweepCommand(ctx) {
    const { client, state, config, messages, args } = ctx;
    const protectedTools = new Set([
        ...(config.commands?.protectedTools || []),
        ...(config.compress?.protectedTools || []),
    ]);
    const count = args && args.length > 0 ? parseInt(args[0], 10) : Infinity;
    if (!Number.isFinite(count) || count < 1)
        throw new Error("Invalid count");
    let pruned = 0;
    let found = 0;
    for (let i = messages.length - 1; i >= 0 && found < count; i--) {
        const msg = messages[i];
        if (msg?.info && msg.info?.role === "user" || msg?.role === "user")
            break;
        if (!Array.isArray(msg?.parts))
            continue;
        let modified = false;
        for (const part of msg.parts) {
            if (part?.type !== "tool")
                continue;
            const toolName = (part.tool || part.name || "");
            if (!toolName || protectedTools.has(toolName))
                continue;
            if (part.state?.status !== "completed")
                continue;
            const input = part.state?.input ?? part.input;
            if (input && typeof input === "object" && !Array.isArray(input)) {
                for (const key of Object.keys(input)) {
                    if (typeof input[key] === "string") {
                        input[key] = "[pruned - sweep]";
                        modified = true;
                    }
                }
            }
            if (part.state?.output && typeof part.state.output === "string") {
                part.state.output = "[pruned - sweep]";
                modified = true;
            }
        }
        if (modified) {
            pruned++;
            found++;
        }
    }
    try {
        await client.tui?.showToast?.({ body: { title: "OHC Sweep", message: `Pruned ${pruned} tool(s)`, variant: "info", duration: 4000 } });
    }
    catch { }
}
export async function handleManualToggleCommand(ctx, modeArg) {
    const { client, state } = ctx;
    if (modeArg === "on")
        state.manualMode = "active";
    else if (modeArg === "off")
        state.manualMode = false;
    else
        state.manualMode = state.manualMode ? false : "active";
    try {
        await client.tui?.showToast?.({
            body: { title: "OHC Manual Mode", message: state.manualMode ? MANUAL_MODE_ON : MANUAL_MODE_OFF, variant: "info", duration: 4000 },
        });
    }
    catch { }
}
export async function handleManualTriggerCommand(ctx, tool, userFocus) {
    return getTriggerPrompt(ctx.state, ctx.config, userFocus);
}
export async function handleDecompressCommand(ctx) {
    const { client, state, args, cwd } = ctx;
    const blockId = args?.[0];
    if (!blockId) {
        const blocks = getActiveBlocks(state);
        if (blocks.length === 0) {
            try {
                await client.tui?.showToast?.({ body: { title: "OHC Decompress", message: "No active compressions", variant: "info", duration: 4000 } });
            }
            catch { }
            return;
        }
        const lines = blocks.map(b => `${b.id}: ${b.topic} (${countTokens(b.summary)} tokens)`).join("\n");
        try {
            await client.tui?.showToast?.({ body: { title: "OHC Active Blocks", message: lines, variant: "info", duration: 8000 } });
        }
        catch { }
        return;
    }
    const block = state.blocks.find(b => b.id === blockId);
    if (!block) {
        try {
            await client.tui?.showToast?.({ body: { title: "OHC Decompress", message: `Block ${blockId} not found`, variant: "warning", duration: 4000 } });
        }
        catch { }
        ;
        return;
    }
    block.deactivatedAt = Date.now();
    state.decompressedBlocks.push({ ...block });
    state.blocks = state.blocks.filter(b => b.id !== blockId);
    syncBlockToState(state, cwd);
    try {
        await client.tui?.showToast?.({ body: { title: "OHC Decompress", message: `Restored block ${blockId} (${block.topic})`, variant: "info", duration: 4000 } });
    }
    catch { }
}
export async function handleRecompressCommand(ctx) {
    const { client, state, args, cwd } = ctx;
    const blockId = args?.[0];
    if (!blockId) {
        const blocks = state.decompressedBlocks.filter(b => !b.deactivatedAt || (Date.now() - b.deactivatedAt) < 86400000);
        if (blocks.length === 0) {
            try {
                await client.tui?.showToast?.({ body: { title: "OHC Recompress", message: "No recompressible blocks", variant: "info", duration: 4000 } });
            }
            catch { }
            ;
            return;
        }
        const lines = blocks.map(b => `${b.id}: ${b.topic}`).join("\n");
        try {
            await client.tui?.showToast?.({ body: { title: "OHC Recompressible", message: lines, variant: "info", duration: 8000 } });
        }
        catch { }
        return;
    }
    const idx = state.decompressedBlocks.findIndex(b => b.id === blockId);
    if (idx === -1) {
        try {
            await client.tui?.showToast?.({ body: { title: "OHC Recompress", message: `Block ${blockId} not found`, variant: "warning", duration: 4000 } });
        }
        catch { }
        ;
        return;
    }
    const block = state.decompressedBlocks[idx];
    block.deactivatedAt = null;
    block.appliedAt = Date.now();
    state.blocks.push(block);
    state.decompressedBlocks.splice(idx, 1);
    syncBlockToState(state, cwd);
    try {
        await client.tui?.showToast?.({ body: { title: "OHC Recompress", message: `Re-applied block ${blockId} (${block.topic})`, variant: "info", duration: 4000 } });
    }
    catch { }
}
function countTokens(text) { if (!text)
    return 0; return Math.ceil(text.length / 4); }
//# sourceMappingURL=index.js.map