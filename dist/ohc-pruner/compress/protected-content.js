import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
const PROTECT_TAG_RE = /<protect>([\s\S]*?)<\/protect>/g;
export function hasProtectedTags(text) {
    PROTECT_TAG_RE.lastIndex = 0;
    return PROTECT_TAG_RE.test(text);
}
export function extractProtectedText(text) {
    const parts = [];
    let lastIdx = 0;
    PROTECT_TAG_RE.lastIndex = 0;
    let m;
    while ((m = PROTECT_TAG_RE.exec(text)) !== null) {
        parts.push(m[1]);
        lastIdx = m.index + m[0].length;
    }
    return parts;
}
export function appendProtectedUserMessages(summary, selection, searchContext, config) {
    if (!config.protectUserMessages)
        return summary;
    let augmented = summary;
    for (const msgId of selection.messageIds || []) {
        const msg = searchContext.messageById?.get(msgId);
        if (msg && msg.role === "user") {
            const text = extractText(msg);
            if (text)
                augmented += `\n\n<protected-user>\n${text}\n</protected-user>`;
        }
    }
    return augmented;
}
export function appendProtectedPromptInfo(summary, selection, searchContext, config) {
    if (!config.protectTags)
        return summary;
    let augmented = summary;
    for (const msgId of selection.messageIds || []) {
        const msg = searchContext.messageById?.get(msgId);
        if (msg) {
            const text = extractText(msg);
            if (text && hasProtectedTags(text)) {
                const protectedParts = extractProtectedText(text);
                for (const part of protectedParts) {
                    augmented += `\n\n<protected-content>\n${part}\n</protected-content>`;
                }
            }
        }
    }
    return augmented;
}
async function getFileContent(pattern, workDir) {
    try {
        const dir = workDir || process.cwd();
        const baseName = pattern.replace(/\*/g, "").replace(/\?/g, "");
        const results = [];
        function walk(d) {
            let entries;
            try {
                entries = readdirSync(d, { withFileTypes: true });
            }
            catch {
                return;
            }
            for (const e of entries) {
                const fp = join(d, e.name);
                if (e.isDirectory()) {
                    walk(fp);
                    continue;
                }
                if (fp.includes(baseName) || pattern === "*" || fp.endsWith(baseName)) {
                    if (results.length >= 5)
                        return;
                    try {
                        results.push(`--- ${fp} ---\n${readFileSync(fp, "utf8").slice(0, 2000)}`);
                    }
                    catch { }
                }
            }
        }
        walk(dir);
        return results;
    }
    catch {
        return [];
    }
}
export async function appendProtectedTools(client, config, summary, selection, searchContext) {
    const protectedTools = config.compress?.protectedTools || [];
    const filePatterns = config.protectedFilePatterns || [];
    if (protectedTools.length === 0 && filePatterns.length === 0)
        return summary;
    let augmented = summary;
    const seen = new Set();
    for (const msgId of selection.messageIds || []) {
        const msg = searchContext.messageById?.get(msgId);
        if (!msg || !Array.isArray(msg.parts))
            continue;
        for (const part of msg.parts) {
            if (part?.type !== "tool")
                continue;
            const toolName = part.tool || part.name || "";
            if (protectedTools.includes(toolName) && part.state?.output) {
                const key = `${toolName}:${msgId}`;
                if (!seen.has(key)) {
                    seen.add(key);
                    const output = typeof part.state.output === "string"
                        ? part.state.output
                        : JSON.stringify(part.state.output);
                    augmented += `\n\n<protected-tool name="${toolName}">\n${output.slice(0, 3000)}\n</protected-tool>`;
                }
            }
            if (filePatterns.length > 0 && part.state?.input) {
                const input = typeof part.state.input === "string"
                    ? part.state.input
                    : JSON.stringify(part.state.input);
                for (const pattern of filePatterns) {
                    if (input.includes(pattern.replace("*", "").replace("?", ""))) {
                        const key = `file:${pattern}:${msgId}`;
                        if (!seen.has(key)) {
                            seen.add(key);
                            const files = await getFileContent(pattern, searchContext.cwd);
                            for (const fc of files) {
                                augmented += `\n\n<protected-file pattern="${pattern}">\n${fc}\n</protected-file>`;
                            }
                        }
                    }
                }
            }
        }
    }
    return augmented;
}
function extractText(msg) {
    if (!Array.isArray(msg.parts))
        return "";
    return msg.parts
        .filter(p => p?.type === "text")
        .map(p => p.text || "")
        .join("\n");
}
//# sourceMappingURL=protected-content.js.map