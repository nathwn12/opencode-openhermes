export function isSecureMode() {
    return !!process.env.OPENCODE_SERVER_PASSWORD;
}
export function getAuthorizationHeader() {
    const password = process.env.OPENCODE_SERVER_PASSWORD;
    if (!password)
        return null;
    const encoded = Buffer.from(`opencode:${password}`).toString("base64");
    return `Basic ${encoded}`;
}
export function configureClientAuth(client) {
    const header = getAuthorizationHeader();
    if (!header)
        return;
    const originalRequest = client.request;
    if (typeof originalRequest !== "function")
        return;
    client.request = async function interceptedRequest(...args) {
        const opts = args[args.length - 1];
        if (opts && typeof opts === "object") {
            opts.headers = {
                ...opts.headers || {},
                Authorization: header,
            };
        }
        return originalRequest.apply(client, args);
    };
}
//# sourceMappingURL=auth.js.map