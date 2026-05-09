import { PromptStore } from "./store.js";
export interface RenderSystemPromptOptions {
    protectedTools?: string[];
    manualMode?: boolean;
    isSubAgent?: boolean;
    customPromptsEnabled?: boolean;
    promptStore?: PromptStore;
}
export declare function renderSystemPrompt(options: RenderSystemPromptOptions): string;
//# sourceMappingURL=index.d.ts.map