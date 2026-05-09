export declare class Logger {
    private debugEnabled;
    constructor(debug?: boolean);
    private log;
    info(message: string, data?: unknown): void;
    debug(message: string, data?: unknown): void;
    warn(message: string, data?: unknown): void;
    error(message: string, data?: unknown): void;
    saveContext(sessionId: string, messages: unknown[]): void;
    minimizeForDebug(messages: unknown[]): unknown[];
}
//# sourceMappingURL=logger.d.ts.map