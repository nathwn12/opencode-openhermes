import { describe, it } from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import os from "node:os"

describe("browser-manager", () => {
  let mod

  it("loads module without errors", async () => {
    mod = await import("../lib/browser-manager.mjs")
    assert.ok(typeof mod.startBrowser === "function")
    assert.ok(typeof mod.stopBrowser === "function")
    assert.ok(typeof mod.getStatus === "function")
    assert.ok(typeof mod.getBinaryPath === "function")
    assert.ok(typeof mod.sendCommand === "function")
  })

  it("getBinaryPath returns correct path for current platform", () => {
    const binPath = mod.getBinaryPath()
    const platform = process.platform
    const arch = process.arch === "x64" ? "x64" : process.arch
    const expectedName = `browser-daemon-${platform}-${arch}${platform === "win32" ? ".exe" : ""}`
    assert.ok(binPath.endsWith(expectedName), `Expected ${expectedName}, got ${binPath}`)
  })

  it("getBinaryPath includes vendor directory", () => {
    const binPath = mod.getBinaryPath()
    assert.ok(binPath.includes(path.sep + "vendor" + path.sep), `Expected vendor dir, got ${binPath}`)
  })

  it("getStatus returns {running: false} when no state file", async () => {
    const CWD_BACKUP = process.cwd
    const testDir = path.join(os.tmpdir(), "oh-browser-test-" + Date.now())
    fs.mkdirSync(testDir, { recursive: true })
    Object.defineProperty(process, "cwd", { value: () => testDir, configurable: true })

    const status = await mod.getStatus()
    assert.strictEqual(status.running, false)
    assert.strictEqual(status.port, null)
    assert.strictEqual(status.pid, null)

    Object.defineProperty(process, "cwd", { value: CWD_BACKUP, configurable: true })
    fs.rmSync(testDir, { recursive: true, force: true })
  })

  it("getStatus reads saved state correctly", async () => {
    const CWD_BACKUP = process.cwd
    const testDir = path.join(os.tmpdir(), "oh-browser-test2-" + Date.now())
    fs.mkdirSync(testDir, { recursive: true })
    Object.defineProperty(process, "cwd", { value: () => testDir, configurable: true })

    const stateFile = path.join(testDir, ".openhermes-browser.json")
    fs.writeFileSync(stateFile, JSON.stringify({
      port: 9999, token: "test-token", pid: 12345, url: "http://127.0.0.1:9999",
    }), "utf8")

    const status = await mod.getStatus()
    assert.strictEqual(status.running, true)
    assert.strictEqual(status.port, 9999)
    assert.strictEqual(status.pid, 12345)

    Object.defineProperty(process, "cwd", { value: CWD_BACKUP, configurable: true })
    fs.rmSync(testDir, { recursive: true, force: true })
  })

  it("sendCommand throws helpful error when not running", async () => {
    const CWD_BACKUP = process.cwd
    const testDir = path.join(os.tmpdir(), "oh-browser-test3-" + Date.now())
    fs.mkdirSync(testDir, { recursive: true })
    Object.defineProperty(process, "cwd", { value: () => testDir, configurable: true })

    try {
      await mod.sendCommand("goto", { url: "https://example.com" })
      assert.fail("Expected error was not thrown")
    } catch (err) {
      assert.ok(err.message.includes("not running"), `Expected 'not running' error, got: ${err.message}`)
    }

    Object.defineProperty(process, "cwd", { value: CWD_BACKUP, configurable: true })
    fs.rmSync(testDir, { recursive: true, force: true })
  })

  it("startBrowser throws if binary does not exist", async () => {
    const CWD_BACKUP = process.cwd
    const testDir = path.join(os.tmpdir(), "oh-browser-test4-" + Date.now())
    const vendorDir = path.join(testDir, "vendor")
    fs.mkdirSync(vendorDir, { recursive: true })
    Object.defineProperty(process, "cwd", { value: () => testDir, configurable: true })

    try {
      await mod.startBrowser()
      assert.fail("Expected error was not thrown")
    } catch (err) {
      assert.ok(err.message.includes("not found"), `Expected 'not found' error, got: ${err.message}`)
    }

    Object.defineProperty(process, "cwd", { value: CWD_BACKUP, configurable: true })
    fs.rmSync(testDir, { recursive: true, force: true })
  })
})
