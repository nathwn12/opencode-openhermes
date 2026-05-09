import type { SessionState } from "../../state.js";
import type { Logger } from "../../logger.js";
import type { PluginConfig } from "../../config.js";
import type { CompressionPriorityMap } from "../priority.js";
import type { PromptCollection } from "../../prompts/store.js";
export declare function injectCompressNudges(state: SessionState, config: PluginConfig, logger: Logger, messages: unknown[], compressionPriorities?: CompressionPriorityMap, prompts?: Pick<PromptCollection, "context-limit-nudge" | "turn-nudge" | "iteration-nudge">): void;
export declare function injectMessageIds(state: SessionState, config: PluginConfig, messages: unknown[], compressionPriorities?: CompressionPriorityMap): void;
//# sourceMappingURL=inject.d.ts.map