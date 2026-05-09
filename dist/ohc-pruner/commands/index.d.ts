import type { SessionState } from "../state.js";
import type { PluginConfig } from "../config.js";
interface CommandContext {
    client: {
        tui?: {
            showToast?: (opts: unknown) => Promise<unknown>;
        };
        session?: {
            messages?: (opts: unknown) => Promise<unknown>;
        };
    };
    state: SessionState;
    config: PluginConfig;
    sessionId?: string;
    messages: unknown[];
    cwd: string;
    args?: string[];
}
export declare function applyPendingManualTrigger(state: SessionState, messages: unknown[]): void;
export declare function handleHelpCommand(ctx: CommandContext): Promise<void>;
export declare function handleContextCommand(ctx: CommandContext): Promise<void>;
export declare function handleStatsCommand(ctx: CommandContext): Promise<void>;
export declare function handleSweepCommand(ctx: CommandContext): Promise<void>;
export declare function handleManualToggleCommand(ctx: CommandContext, modeArg?: string): Promise<void>;
export declare function handleManualTriggerCommand(ctx: CommandContext, tool: string, userFocus?: string): Promise<string>;
export declare function handleDecompressCommand(ctx: CommandContext): Promise<void>;
export declare function handleRecompressCommand(ctx: CommandContext): Promise<void>;
export {};
//# sourceMappingURL=index.d.ts.map