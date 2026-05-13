import { describe, it, beforeEach } from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import os from "node:os"

const CWD_BACKUP = process.cwd
const TEST_DIR = path.join(os.tmpdir(), "oh-guard-test-" + Date.now())

beforeEach(() => {
  fs.mkdirSync(TEST_DIR, { recursive: true })
  const guardFile = path.join(TEST_DIR, ".openhermes-guard.json")
  if (fs.existsSync(guardFile)) fs.unlinkSync(guardFile)
  process.chdir = () => {}
  Object.defineProperty(process, "cwd", { value: () => TEST_DIR, configurable: true })
})

describe("guard-state", () => {
  let mod

  it("loads module without errors", async () => {
    mod = await import("../lib/guard-state.mjs")
    assert.ok(typeof mod.getState === "function")
    assert.ok(typeof mod.setState === "function")
    assert.ok(typeof mod.isFrozen === "function")
    assert.ok(typeof mod.freezeDir === "function")
    assert.ok(typeof mod.unfreezeDir === "function")
    assert.ok(typeof mod.listFrozenDirs === "function")
    assert.ok(typeof mod.isCarefulMode === "function")
    assert.ok(typeof mod.setCarefulMode === "function")
  })

  it("getState returns default state when no file exists", () => {
    const state = mod.getState()
    assert.strictEqual(state.carefulMode, false)
    assert.deepStrictEqual(state.frozenDirs, [])
    assert.strictEqual(state.guardMode, false)
  })

  it("freezeDir adds directory", () => {
    mod.freezeDir("/tmp/test")
    const dirs = mod.listFrozenDirs()
    assert.ok(dirs.includes("/tmp/test"))
  })

  it("unfreezeDir removes directory", () => {
    mod.freezeDir("/tmp/test")
    mod.unfreezeDir("/tmp/test")
    assert.ok(!mod.listFrozenDirs().includes("/tmp/test"))
  })

  it("isFrozen checks correctly", () => {
    assert.strictEqual(mod.isFrozen("/tmp/unknown"), false)
    mod.freezeDir("/tmp/known")
    assert.strictEqual(mod.isFrozen("/tmp/known"), true)
  })

  it("setCarefulMode toggles", () => {
    mod.setCarefulMode(true)
    assert.strictEqual(mod.isCarefulMode(), true)
    mod.setCarefulMode(false)
    assert.strictEqual(mod.isCarefulMode(), false)
  })

  it("guardMode is persisted in state", () => {
    mod.setState({ guardMode: true })
    const state = mod.getState()
    assert.strictEqual(state.guardMode, true)
  })

  it("freezeDir is idempotent", () => {
    mod.freezeDir("/tmp/dup")
    mod.freezeDir("/tmp/dup")
    assert.strictEqual(mod.listFrozenDirs().filter(d => d === "/tmp/dup").length, 1)
  })

  it("setState merges with existing state", () => {
    mod.freezeDir("/tmp/merge")
    mod.setState({ guardMode: true })
    const state = mod.getState()
    assert.ok(state.frozenDirs.includes("/tmp/merge"))
    assert.strictEqual(state.guardMode, true)
  })

  it("file persistence round-trip", () => {
    mod.setCarefulMode(true)
    mod.freezeDir("/tmp/persist")
    mod.setState({ guardMode: true })

    const fp = path.join(TEST_DIR, ".openhermes-guard.json")
    assert.ok(fs.existsSync(fp))

    const raw = JSON.parse(fs.readFileSync(fp, "utf8"))
    assert.strictEqual(raw.carefulMode, true)
    assert.ok(raw.frozenDirs.includes("/tmp/persist"))
    assert.strictEqual(raw.guardMode, true)
  })

  it("getState handles corrupted JSON gracefully", () => {
    const fp = path.join(TEST_DIR, ".openhermes-guard.json")
    fs.writeFileSync(fp, "not valid json", "utf8")
    const state = mod.getState()
    assert.strictEqual(state.carefulMode, false)
    assert.deepStrictEqual(state.frozenDirs, [])
  })
})
