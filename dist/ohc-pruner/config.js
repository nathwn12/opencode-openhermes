import { existsSync, readFileSync, writeFileSync, mkdirSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { homedir } from "node:os";
const DEFAULT_PROTECTED_TOOLS = [
    "task", "skill", "todowrite", "todoread",
    "compress", "batch", "plan_enter", "plan_exit", "write", "edit",
];
const COMPRESS_DEFAULT_PROTECTED_TOOLS = ["task", "skill", "todowrite", "todoread"];
export const DEFAULT_CONFIG = {
    enabled: true,
    autoUpdate: false,
    debug: false,
    pruneNotification: "detailed",
    pruneNotificationType: "toast",
    commands: {
        enabled: true,
        protectedTools: [...DEFAULT_PROTECTED_TOOLS],
    },
    manualMode: {
        enabled: false,
        automaticStrategies: true,
    },
    turnProtection: {
        enabled: false,
        turns: 4,
    },
    experimental: {
        allowSubAgents: false,
        customPrompts: false,
    },
    protectedFilePatterns: [],
    compress: {
        mode: "range",
        permission: "allow",
        showCompression: false,
        summaryBuffer: true,
        maxContextLimit: 100000,
        minContextLimit: 50000,
        nudgeFrequency: 5,
        iterationNudgeThreshold: 15,
        nudgeForce: "soft",
        protectedTools: [...COMPRESS_DEFAULT_PROTECTED_TOOLS],
        protectTags: false,
        protectUserMessages: false,
    },
    strategies: {
        deduplication: {
            enabled: true,
            protectedTools: [],
            turns: 0,
        },
        purgeErrors: {
            enabled: true,
            turns: 4,
            protectedTools: [],
        },
    },
};
function isPlainObject(v) {
    return !!v && typeof v === "object" && !Array.isArray(v);
}
function uniqueStrings(arr) {
    return [...new Set((arr || []).filter((v) => typeof v === "string" && v.length > 0))];
}
function cloneDefault() {
    const d = DEFAULT_CONFIG;
    return {
        ...d,
        commands: { ...d.commands, protectedTools: [...d.commands.protectedTools] },
        manualMode: { ...d.manualMode },
        turnProtection: { ...d.turnProtection },
        experimental: { ...d.experimental },
        protectedFilePatterns: [...d.protectedFilePatterns],
        compress: { ...d.compress, protectedTools: [...d.compress.protectedTools] },
        strategies: {
            deduplication: { ...d.strategies.deduplication, protectedTools: [...d.strategies.deduplication.protectedTools] },
            purgeErrors: { ...d.strategies.purgeErrors, protectedTools: [...d.strategies.purgeErrors.protectedTools] },
        },
    };
}
function mergeLayer(config, data) {
    if (!isPlainObject(data))
        return config;
    const next = cloneDefault();
    Object.assign(next, config);
    if (typeof data.enabled === "boolean")
        next.enabled = data.enabled;
    if (typeof data.debug === "boolean")
        next.debug = data.debug;
    if (typeof data.pruneNotification === "string")
        next.pruneNotification = data.pruneNotification;
    if (typeof data.pruneNotificationType === "string")
        next.pruneNotificationType = data.pruneNotificationType;
    if (isPlainObject(data.commands)) {
        const cd = data.commands;
        next.commands.enabled = (typeof cd.enabled === "boolean") ? cd.enabled : config.commands.enabled;
        next.commands.protectedTools = uniqueStrings([...config.commands.protectedTools, ...(Array.isArray(cd.protectedTools) ? cd.protectedTools : [])]);
    }
    if (isPlainObject(data.manualMode)) {
        const mm = data.manualMode;
        if (typeof mm.enabled === "boolean")
            next.manualMode.enabled = mm.enabled;
        if (typeof mm.automaticStrategies === "boolean")
            next.manualMode.automaticStrategies = mm.automaticStrategies;
    }
    if (isPlainObject(data.turnProtection)) {
        const tp = data.turnProtection;
        if (typeof tp.enabled === "boolean")
            next.turnProtection.enabled = tp.enabled;
        if (typeof tp.turns === "number")
            next.turnProtection.turns = tp.turns;
    }
    if (isPlainObject(data.experimental)) {
        const ex = data.experimental;
        if (typeof ex.allowSubAgents === "boolean")
            next.experimental.allowSubAgents = ex.allowSubAgents;
        if (typeof ex.customPrompts === "boolean")
            next.experimental.customPrompts = ex.customPrompts;
    }
    if (Array.isArray(data.protectedFilePatterns)) {
        next.protectedFilePatterns = uniqueStrings([...config.protectedFilePatterns, ...data.protectedFilePatterns]);
    }
    if (isPlainObject(data.compress)) {
        const c = data.compress;
        if (c.mode === "range" || c.mode === "message")
            next.compress.mode = c.mode;
        if (c.permission === "allow" || c.permission === "ask" || c.permission === "deny")
            next.compress.permission = c.permission;
        if (typeof c.showCompression === "boolean")
            next.compress.showCompression = c.showCompression;
        if (typeof c.summaryBuffer === "boolean")
            next.compress.summaryBuffer = c.summaryBuffer;
        if (c.maxContextLimit !== undefined)
            next.compress.maxContextLimit = c.maxContextLimit;
        if (c.minContextLimit !== undefined)
            next.compress.minContextLimit = c.minContextLimit;
        if (typeof c.nudgeFrequency === "number")
            next.compress.nudgeFrequency = Math.max(1, Math.floor(c.nudgeFrequency));
        if (typeof c.iterationNudgeThreshold === "number")
            next.compress.iterationNudgeThreshold = Math.max(1, Math.floor(c.iterationNudgeThreshold));
        if (c.nudgeForce === "strong" || c.nudgeForce === "soft")
            next.compress.nudgeForce = c.nudgeForce;
        if (Array.isArray(c.protectedTools))
            next.compress.protectedTools = uniqueStrings([...config.compress.protectedTools, ...c.protectedTools]);
        if (typeof c.protectTags === "boolean")
            next.compress.protectTags = c.protectTags;
        if (typeof c.protectUserMessages === "boolean")
            next.compress.protectUserMessages = c.protectUserMessages;
        if (isPlainObject(c.modelMaxLimits))
            next.compress.modelMaxLimits = { ...c.modelMaxLimits };
        if (isPlainObject(c.modelMinLimits))
            next.compress.modelMinLimits = { ...c.modelMinLimits };
    }
    if (isPlainObject(data.strategies)) {
        if (isPlainObject(data.strategies)) {
            const strats = data.strategies;
            if (isPlainObject(strats.deduplication)) {
                const dd = strats.deduplication;
                if (typeof dd.enabled === "boolean")
                    next.strategies.deduplication.enabled = dd.enabled;
                if (Array.isArray(dd.protectedTools))
                    next.strategies.deduplication.protectedTools = uniqueStrings([...config.strategies.deduplication.protectedTools, ...dd.protectedTools]);
            }
            if (isPlainObject(strats.purgeErrors)) {
                const pe = strats.purgeErrors;
                if (typeof pe.enabled === "boolean")
                    next.strategies.purgeErrors.enabled = pe.enabled;
                if (typeof pe.turns === "number")
                    next.strategies.purgeErrors.turns = pe.turns;
                if (Array.isArray(pe.protectedTools))
                    next.strategies.purgeErrors.protectedTools = uniqueStrings([...config.strategies.purgeErrors.protectedTools, ...pe.protectedTools]);
            }
        }
    }
    return next;
}
const GLOBAL_DIR = join(homedir(), ".config", "opencode");
function findOpencodeDir(start) {
    let cur = start;
    while (cur.length > 3) {
        const cand = join(cur, ".opencode");
        if (existsSync(cand) && statSync(cand).isDirectory())
            return cand;
        const parent = dirname(cur);
        if (parent === cur)
            break;
        cur = parent;
    }
    return null;
}
function loadFile(p) {
    try {
        const raw = readFileSync(p, "utf8");
        return JSON.parse(raw);
    }
    catch {
        return null;
    }
}
function validateConfigWarnings(config) {
    const warnings = [];
    if (config.compress.mode !== "range" && config.compress.mode !== "message") {
        warnings.push(`Unknown compress mode "${config.compress.mode}", falling back to "range"`);
    }
    if (config.compress.nudgeFrequency < 1) {
        warnings.push("compress.nudgeFrequency must be >= 1");
    }
    if (config.compress.iterationNudgeThreshold < 1) {
        warnings.push("compress.iterationNudgeThreshold must be >= 1");
    }
    if (config.strategies.purgeErrors.turns < 0) {
        warnings.push("strategies.purgeErrors.turns must be >= 0");
    }
    return warnings;
}
export function loadConfig(cwd, client) {
    let config = cloneDefault();
    const configFile = (dir) => {
        const jsonc = join(dir, "dcp.jsonc");
        if (existsSync(jsonc))
            return jsonc;
        const json = join(dir, "dcp.json");
        if (existsSync(json))
            return json;
        return null;
    };
    const globalPath = configFile(GLOBAL_DIR);
    const configDir = process.env.OPENCODE_CONFIG_DIR
        ? configFile(process.env.OPENCODE_CONFIG_DIR)
        : null;
    const opencodeDir = cwd ? findOpencodeDir(cwd) : null;
    const projectPath = opencodeDir ? configFile(opencodeDir) : null;
    for (const p of [globalPath, configDir, projectPath]) {
        if (!p)
            continue;
        const data = loadFile(p);
        if (data)
            config = mergeLayer(config, data);
    }
    if (!globalPath) {
        try {
            if (!existsSync(GLOBAL_DIR))
                mkdirSync(GLOBAL_DIR, { recursive: true });
            writeFileSync(join(GLOBAL_DIR, "dcp.jsonc"), JSON.stringify({ $schema: "https://raw.githubusercontent.com/Opencode-DCP/opencode-dynamic-context-pruning/master/dcp.schema.json" }, null, 2) +
                "\n// OpenHermes OHC config — uses upstream dcp.schema.json for field validation\n", "utf8");
        }
        catch { }
    }
    const warnings = validateConfigWarnings(config);
    for (const w of warnings) {
        try {
            client?.tui?.showToast?.({ body: { title: "OHC Config Warning", message: w, variant: "warning", duration: 5000 } });
        }
        catch { }
    }
    return config;
}
export function resolveLimit(limit, modelLimit, fallback) {
    if (typeof limit === "number" && Number.isFinite(limit))
        return limit;
    if (typeof limit === "string" && limit.endsWith("%") && typeof modelLimit === "number") {
        const pct = parseFloat(limit);
        if (Number.isFinite(pct))
            return Math.round(modelLimit * (pct / 100));
    }
    if (typeof modelLimit === "number" && Number.isFinite(modelLimit))
        return modelLimit;
    return fallback;
}
export function getEffectiveLimit(config, modelLimit, field) {
    const val = config.compress[field];
    if (typeof val === "number")
        return val;
    return resolveLimit(val, modelLimit, field === "maxContextLimit" ? 100000 : 50000);
}
//# sourceMappingURL=config.js.map