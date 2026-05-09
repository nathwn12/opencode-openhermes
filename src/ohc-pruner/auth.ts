export function isSecureMode(): boolean {
  return !!process.env.OPENCODE_SERVER_PASSWORD
}

export function getAuthorizationHeader(): string | null {
  const password = process.env.OPENCODE_SERVER_PASSWORD
  if (!password) return null
  const encoded = Buffer.from(`opencode:${password}`).toString("base64")
  return `Basic ${encoded}`
}

export function configureClientAuth(client: Record<string, unknown>): void {
  const header = getAuthorizationHeader()
  if (!header) return

  const originalRequest = (client as any).request
  if (typeof originalRequest !== "function") return

  ;(client as any).request = async function interceptedRequest(...args: unknown[]) {
    const opts = args[args.length - 1]
    if (opts && typeof opts === "object") {
      (opts as Record<string, unknown>).headers = {
        ...(opts as Record<string, unknown>).headers as Record<string, string> || {},
        Authorization: header,
      }
    }
    return originalRequest.apply(client, args)
  }
}
