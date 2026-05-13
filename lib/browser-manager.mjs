import { existsSync, readFileSync, writeFileSync, unlinkSync } from "node:fs"
import { join } from "node:path"
import { spawn } from "node:child_process"

function getBinaryName() {
  const platform = process.platform
  const arch = process.arch === "x64" ? "x64" : process.arch
  const ext = platform === "win32" ? ".exe" : ""
  const name = `browser-daemon-${platform}-${arch}${ext}`
  return name
}

export function getBinaryPath() {
  return join(process.cwd(), "vendor", getBinaryName())
}

function getStatePath() {
  return join(process.cwd(), ".openhermes-browser.json")
}

function readState() {
  const fp = getStatePath()
  if (!existsSync(fp)) return null
  try {
    return JSON.parse(readFileSync(fp, "utf8"))
  } catch {
    return null
  }
}

function writeState(state) {
  writeFileSync(getStatePath(), JSON.stringify(state, null, 2), "utf8")
}

export async function startBrowser() {
  const bin = getBinaryPath()
  if (!existsSync(bin)) {
    throw new Error(`Browser daemon binary not found at: ${bin}`)
  }

  return new Promise((resolve, reject) => {
    const child = spawn(bin, [], {
      stdio: ["ignore", "pipe", "pipe"],
      detached: false,
    })

    let output = ""
    const timeout = setTimeout(() => {
      child.kill()
      reject(new Error("Browser daemon did not start in time"))
    }, 15000)

    child.stdout.on("data", (data) => {
      output += data.toString()
      try {
        const info = JSON.parse(output)
        clearTimeout(timeout)
        writeState({
          port: info.port,
          token: info.token,
          pid: info.pid || child.pid,
          url: `http://127.0.0.1:${info.port}`,
        })
        resolve(info)
      } catch { }
    })

    child.stderr.on("data", (data) => {
      output += data.toString()
    })

    child.on("error", (err) => {
      clearTimeout(timeout)
      reject(err)
    })

    child.on("exit", (code) => {
      clearTimeout(timeout)
      if (!output) reject(new Error(`Browser daemon exited with code ${code}`))
    })
  })
}

export async function stopBrowser() {
  const state = readState()
  if (!state) return

  try {
    const resp = await fetch(`${state.url}/command`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${state.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ type: "stop" }),
    })
    await resp.arrayBuffer()
  } catch { }

  try {
    process.kill(state.pid)
  } catch { }

  const fp = getStatePath()
  if (existsSync(fp)) unlinkSync(fp)
}

export async function getStatus() {
  const state = readState()
  if (!state) return { running: false, port: null, pid: null }
  return { running: true, port: state.port, pid: state.pid }
}

export async function sendCommand(type, params = {}) {
  const state = readState()
  if (!state) {
    throw new Error("Browser daemon not running. Call startBrowser() first.")
  }

  const body = { type, ...params }
  const resp = await fetch(`${state.url}/command`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${state.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  })

  const result = await resp.json()
  if (!resp.ok) throw new Error(result.error || `HTTP ${resp.status}`)
  return result
}
