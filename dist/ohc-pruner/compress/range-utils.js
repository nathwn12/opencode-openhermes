const BLOCK_PLACEHOLDER_REGEX = /\(b(\d+)\)|\{block_(\d+)\}/gi;
export function parseBlockPlaceholders(summary) {
    const placeholders = [];
    const regex = new RegExp(BLOCK_PLACEHOLDER_REGEX.source, "gi");
    let match;
    while ((match = regex.exec(summary)) !== null) {
        const full = match[0];
        const blockIdPart = match[1] || match[2];
        placeholders.push({
            raw: full,
            blockId: `b${blockIdPart}`,
            startIndex: match.index,
            endIndex: match.index + full.length,
        });
    }
    return placeholders;
}
export function stripSummaryHeader(summary) {
    const headerMatch = summary.match(/^\s*\[Compressed conversation(?: section)?(?: b\d+)?\]/i);
    if (!headerMatch)
        return summary;
    const afterHeader = summary.slice(headerMatch[0].length);
    return afterHeader.replace(/^(?:\r?\n)+/, "")
        .replace(/(?:\r?\n)*<ohc-message-id>b\d+<\/ohc-message-id>\s*$/i, "")
        .replace(/(?:\r?\n)+$/, "");
}
//# sourceMappingURL=range-utils.js.map