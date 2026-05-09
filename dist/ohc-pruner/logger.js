import { existsSync, mkdirSync, writeFileSync, appendFileSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
const LOG_DIR = join(homedir(), ".config", "opencode", "logs", "ohc");
function ensureDir(dir) {
    if (!existsSync(dir))
        mkdirSync(dir, { recursive: true });
}
function dailyLogPath() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    ensureDir(join(LOG_DIR, "daily"));
    return join(LOG_DIR, "daily", `${y}-${m}-${dd}.log`);
}
export class Logger {
    debugEnabled;
    constructor(debug = false) {
        this.debugEnabled = debug;
        ensureDir(LOG_DIR);
    }
    log(level, message, data) {
        const ts = new Date().toISOString();
        const line = data !== undefined
            ? `[${ts}] [${level}] ${message} ${JSON.stringify(data)}`
            : `[${ts}] [${level}] ${message}`;
        try {
            appendFileSync(dailyLogPath(), line + "\n", "utf8");
        }
        catch { }
        if (level === "ERROR" || level === "WARN") {
            console.error(`[ohc-logger] ${line}`);
        }
    }
    info(message, data) { this.log("INFO", message, data); }
    debug(message, data) { if (this.debugEnabled)
        this.log("DEBUG", message, data); }
    warn(message, data) { this.log("WARN", message, data); }
    error(message, data) { this.log("ERROR", message, data); }
    saveContext(sessionId, messages) {
        const minimized = this.minimizeForDebug(messages);
        try {
            const ctxDir = join(LOG_DIR, "context");
            ensureDir(ctxDir);
            const ts = Date.now();
            writeFileSync(join(ctxDir, `${sessionId}-${ts}.json`), JSON.stringify(minimized, null, 2), "utf8");
        }
        catch { }
    }
    minimizeForDebug(messages) {
        return (messages || []).map(msg => {
            if (!msg || typeof msg !== "object")
                return msg;
            const m = msg;
            const copy = { ...m };
            if (copy.info && typeof copy.info === "object") {
                const info = copy.info;
                copy.info = { id: info.id, role: info.role, ohcRef: info.ohcRef };
            }
            if (Array.isArray(copy.parts)) {
                copy.parts = copy.parts.map(p => {
                    if (!p || typeof p !== "object")
                        return p;
                    const part = p;
                    if (part.type === "text") {
                        const text = (part.text || "");
                        return { type: "text", text: text.length > 200 ? text.slice(0, 200) + "..." : text };
                    }
                    if (part.type === "tool") {
                        return { type: "tool", tool: part.tool, name: part.name, status: part.state?.status };
                    }
                    return p;
                });
            }
            return copy;
        });
    }
}
//# sourceMappingURL=logger.js.map