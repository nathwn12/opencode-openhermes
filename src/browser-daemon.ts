/// <reference lib="dom" />

const HTTP_PORT = Math.floor(Math.random() * 50001) + 10000
const DEBUG_PORT = Math.floor(Math.random() * 50001) + 10000
import { randomUUID } from "node:crypto"
const BEARER_TOKEN = randomUUID() + randomUUID()

function jsonResponse(res: any, status: number, body: object) {
  res.statusCode = status
  res.setHeader("Content-Type", "application/json")
  res.end(JSON.stringify(body))
}

function parseBody(req: any): Promise<any> {
  return new Promise((resolve, reject) => {
    let data = ""
    req.on("data", (chunk: string) => data += chunk)
    req.on("end", () => {
      try { resolve(JSON.parse(data)) }
      catch { reject(new Error("Invalid JSON")) }
    })
    req.on("error", reject)
  })
}

async function launchChrome(): Promise<string> {
  const { spawn } = await import("node:child_process")
  const chromePaths = [
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium-browser",
    "/usr/bin/chromium",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  ]

  let chromeBin = ""
  for (const p of chromePaths) {
    try {
      const { accessSync, constants } = await import("node:fs")
      accessSync(p, constants.X_OK)
      chromeBin = p
      break
    } catch { }
  }

  if (!chromeBin) {
    chromeBin = process.platform === "win32"
      ? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
      : "google-chrome"
  }

  const args = [
    `--remote-debugging-port=${DEBUG_PORT}`,
    "--headless",
    "--disable-gpu",
    "--no-sandbox",
    "--disable-dev-shm-usage",
    "--disable-extensions",
    "--mute-audio",
    "--no-first-run",
    "--window-size=1280,720",
    "about:blank",
  ]

  const child = spawn(chromeBin, args, {
    stdio: "ignore",
    detached: false,
  })

  child.on("error", (err: Error) => {
    console.error("Chrome launch failed:", err.message)
  })

  // Wait for debug endpoint to be ready
  const maxRetries = 30
  for (let i = 0; i < maxRetries; i++) {
    try {
      const resp = await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/version`)
      if (resp.ok) {
        const data: any = await resp.json()
        return data.webSocketDebuggerUrl
      }
    } catch { }
    await new Promise(r => setTimeout(r, 200))
  }
  throw new Error("Chrome did not start in time")
}

let wsUrl: string = ""
let pageId: string = ""
let processRef: any = null

async function ensurePage(): Promise<string> {
  if (wsUrl && pageId) return pageId
  wsUrl = await launchChrome()
  const resp = await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/new?about:blank`)
  const data: any = await resp.json()
  pageId = data.id
  return pageId
}

async function sendCDP(method: string, params: object = {}): Promise<any> {
  const tabInfo = await fetch(`http://127.0.0.1:${DEBUG_PORT}/json`)
  const tabs: any[] = await tabInfo.json()
  const target = tabs.find((t: any) => t.id === pageId) || tabs[0]
  if (!target) throw new Error("No CDP target found")

  const wsRes = await fetch(target.webSocketDebuggerUrl.replace("ws://", "http://"))
  // Use CDP via HTTP to the devtools endpoint
  const cdpUrl = `http://127.0.0.1:${DEBUG_PORT}/json/protocol`

  // For commands, we use the raw CDP session via fetch to the websocket URL pattern
  const { WebSocket } = await import("ws")
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(target.webSocketDebuggerUrl)
    const msgId = Date.now()
    const timer = setTimeout(() => {
      ws.close()
      reject(new Error("CDP command timeout"))
    }, 30000)

    ws.on("open", () => {
      ws.send(JSON.stringify({ id: msgId, method, params }))
    })

    ws.on("message", (raw: string) => {
      try {
        const msg = JSON.parse(raw.toString())
        if (msg.id === msgId) {
          clearTimeout(timer)
          ws.close()
          if (msg.error) reject(new Error(msg.error.message))
          else resolve(msg.result)
        }
      } catch { }
    })

    ws.on("error", (err: Error) => {
      clearTimeout(timer)
      reject(err)
    })
  })
}

async function handleCommand(cmd: any): Promise<object> {
  switch (cmd.type) {
    case "goto": {
      const url = cmd.url
      if (typeof url !== "string" || !/^https?:\/\//i.test(url)) {
        throw new Error("Only HTTP(S) URLs allowed")
      }
      await ensurePage()
      await sendCDP("Page.enable")
      await sendCDP("Page.navigate", { url })
      await new Promise(r => setTimeout(r, 2000))
      return { ok: true, url }
    }

    case "click": {
      await ensurePage()
      const selector = cmd.selector
      if (typeof selector !== "string") throw new Error("Missing selector")
      const result = await sendCDP("Runtime.evaluate", {
        expression: `document.querySelector(${JSON.stringify(selector)})?.click()`,
        returnByValue: true,
      })
      return { ok: true, clicked: result.result?.value !== undefined }
    }

    case "fill": {
      await ensurePage()
      const selector = cmd.selector
      const value = cmd.value ?? ""
      if (typeof selector !== "string") throw new Error("Missing selector")
      await sendCDP("Runtime.evaluate", {
        expression: `
          (() => {
            const el = document.querySelector(${JSON.stringify(selector)});
            if (!el) return false;
            el.value = ${JSON.stringify(value)};
            el.dispatchEvent(new Event('input', { bubbles: true }));
            el.dispatchEvent(new Event('change', { bubbles: true }));
            return true;
          })()
        `,
        returnByValue: true,
      })
      return { ok: true }
    }

    case "screenshot": {
      await ensurePage()
      const result = await sendCDP("Page.captureScreenshot", { format: "png", fromSurface: true })
      return { ok: true, data: result.data }
    }

    case "html": {
      await ensurePage()
      const result = await sendCDP("Runtime.evaluate", {
        expression: "document.documentElement.outerHTML",
        returnByValue: true,
      })
      return { ok: true, html: result.result?.value || "" }
    }

    case "text": {
      await ensurePage()
      const result = await sendCDP("Runtime.evaluate", {
        expression: "document.body?.innerText || ''",
        returnByValue: true,
      })
      return { ok: true, text: result.result?.value || "" }
    }

    case "stop":
      await sendCDP("Browser.close").catch(() => {})
      if (processRef) processRef.kill()
      process.exit(0)

    default:
      throw new Error(`Unknown command type: ${cmd.type}`)
  }
}

async function main() {
  const http = await import("node:http")

  const server = http.createServer(async (req, res) => {
    const auth = req.headers["authorization"] || ""

    if (auth !== `Bearer ${BEARER_TOKEN}`) {
      jsonResponse(res, 401, { error: "Unauthorized" })
      return
    }

    if (req.method !== "POST") {
      jsonResponse(res, 405, { error: "Method not allowed" })
      return
    }

    try {
      const body = await parseBody(req)
      if (!body || !body.type) {
        jsonResponse(res, 400, { error: "Missing command type" })
        return
      }
      const result = await handleCommand(body)
      jsonResponse(res, 200, result)
    } catch (err: any) {
      jsonResponse(res, 500, { error: err.message })
    }
  })

  server.listen(HTTP_PORT, () => {
    console.log(JSON.stringify({
      port: HTTP_PORT,
      token: BEARER_TOKEN,
      debugPort: DEBUG_PORT,
      pid: process.pid,
    }))
  })
}

main().catch(err => {
  console.error(JSON.stringify({ error: err.message }))
  process.exit(1)
})
