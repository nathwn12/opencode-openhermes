import type { SessionState } from "../state.js";
export declare function createSyntheticUserMessage(baseMessage: Record<string, unknown>, content: string, stableSeed?: string): Record<string, unknown>;
export declare function createSyntheticTextPart(baseMessage: Record<string, unknown>, content: string, stableSeed?: string): Record<string, unknown>;
export declare function appendToTextPart(part: Record<string, unknown>, injection: string): boolean;
export declare function appendToLastTextPart(message: Record<string, unknown>, injection: string): boolean;
export declare function appendToToolPart(part: any, tag: string): boolean;
export declare function appendToAllToolParts(message: Record<string, unknown>, tag: string): boolean;
export declare function hasContent(message: Record<string, unknown>): boolean;
export declare function buildToolIdList(state: SessionState, messages: unknown[]): string[];
export declare function stripHallucinationsFromString(text: string): string;
export declare function stripHallucinations(messages: unknown[]): void;
//# sourceMappingURL=utils.d.ts.map