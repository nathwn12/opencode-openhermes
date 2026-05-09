import { getMessageId } from "./index.js";
export function syncCompressionBlocks(state, logger, messages) {
    const messagesState = state.prune?.messages;
    if (!messagesState)
        return;
    if (messagesState.blocksById.size === 0 && state.blocks.length > 0) {
        for (const block of state.blocks) {
            messagesState.blocksById.set(block.id, block);
            if (!block.deactivatedAt) {
                messagesState.activeBlockIds.add(block.id);
                for (const msgId of block.messageIds || []) {
                    if (!msgId)
                        continue;
                    const existing = messagesState.byMessageId.get(msgId);
                    if (existing) {
                        if (!existing.allBlockIds.includes(block.id))
                            existing.allBlockIds.push(block.id);
                        if (!existing.activeBlockIds.includes(block.id))
                            existing.activeBlockIds.push(block.id);
                    }
                    else {
                        messagesState.byMessageId.set(msgId, {
                            allBlockIds: [block.id],
                            activeBlockIds: [block.id],
                        });
                    }
                }
            }
        }
    }
    if (!messagesState.blocksById.size)
        return;
    const messageIds = new Set(messages.map(m => getMessageId(m)).filter(Boolean));
    const previousActiveBlockIds = new Set(Array.from(messagesState.blocksById.values())
        .filter(b => b.active)
        .map(b => b.id));
    messagesState.activeBlockIds.clear();
    const now = Date.now();
    const missingOriginBlockIds = [];
    const orderedBlocks = Array.from(messagesState.blocksById.entries())
        .sort(([, a], [, b]) => a.createdAt - b.createdAt || a.id.localeCompare(b.id))
        .map(([, v]) => v);
    for (const block of orderedBlocks) {
        const blockAny = block;
        const hasOriginMessage = typeof block.compressMessageId === "string" &&
            block.compressMessageId.length > 0 &&
            messageIds.has(block.compressMessageId);
        if (!hasOriginMessage) {
            blockAny.active = false;
            block.deactivatedAt = now;
            missingOriginBlockIds.push(block.id);
            continue;
        }
        if (blockAny.deactivatedByUser) {
            blockAny.active = false;
            if (block.deactivatedAt === undefined || block.deactivatedAt === null) {
                block.deactivatedAt = now;
            }
            continue;
        }
        for (const consumedBlockId of block.consumedBlockIds) {
            if (!messagesState.activeBlockIds.has(consumedBlockId))
                continue;
            const consumedBlock = messagesState.blocksById.get(consumedBlockId);
            if (consumedBlock) {
                consumedBlock.active = false;
                consumedBlock.deactivatedAt = now;
                consumedBlock.deactivatedByBlockId = block.id;
            }
            messagesState.activeBlockIds.delete(consumedBlockId);
        }
        blockAny.active = true;
        block.deactivatedAt = null;
        blockAny.deactivatedByBlockId = undefined;
        messagesState.activeBlockIds.add(block.id);
    }
    for (const entry of messagesState.byMessageId.values()) {
        const e = entry;
        const allBlockIds = Array.isArray(e.allBlockIds)
            ? [...new Set(e.allBlockIds.filter(id => typeof id === "string" && id.length > 0))]
            : [];
        e.allBlockIds = allBlockIds;
        e.activeBlockIds = allBlockIds.filter((id) => messagesState.activeBlockIds.has(id));
    }
    const nextActiveBlockIds = messagesState.activeBlockIds;
    let deactivatedCount = 0;
    let reactivatedCount = 0;
    for (const blockId of previousActiveBlockIds) {
        if (!nextActiveBlockIds.has(blockId))
            deactivatedCount++;
    }
    for (const blockId of nextActiveBlockIds) {
        if (!previousActiveBlockIds.has(blockId))
            reactivatedCount++;
    }
    if (missingOriginBlockIds.length > 0 || deactivatedCount > 0 || reactivatedCount > 0) {
        logger.info("Synced compress block state", {
            missingOriginCount: missingOriginBlockIds.length,
            deactivatedCount,
            reactivatedCount,
        });
    }
}
//# sourceMappingURL=sync.js.map