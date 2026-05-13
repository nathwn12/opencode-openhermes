import { describe, it, afterEach } from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import os from "node:os"

const ORIGINAL = process.env.XDG_CONFIG_HOME
const TEST_DIR = path.join(os.tmpdir(), "oh-session-test-" + Date.now())

afterEach(() => {
  if (ORIGINAL) process.env.XDG_CONFIG_HOME = ORIGINAL
  else delete process.env.XDG_CONFIG_HOME
  fs.rmSync(TEST_DIR, { recursive: true, force: true })
})

function setTestDir() {
  process.env.XDG_CONFIG_HOME = TEST_DIR
}

describe("session-manager", () => {
  let mod

  it("loads module without errors", async () => {
    mod = await import("../lib/session-manager.mjs")
    assert.ok(typeof mod.saveSession === "function")
    assert.ok(typeof mod.resumeSession === "function")
    assert.ok(typeof mod.listSessions === "function")
    assert.ok(typeof mod.pruneSessions === "function")
  })

  it("saveSession creates a new session file", () => {
    setTestDir()
    const id = mod.saveSession({ summary: "test session" })
    assert.ok(id.startsWith("session_"))
    const fp = path.join(TEST_DIR, "sessions", `${id}.json`)
    assert.ok(fs.existsSync(fp))
    const raw = JSON.parse(fs.readFileSync(fp, "utf8"))
    assert.strictEqual(raw.id, id)
    assert.strictEqual(raw.summary, "test session")
    assert.strictEqual(raw.status, "active")
  })

  it("resumeSession returns null for unknown id", () => {
    setTestDir()
    const result = mod.resumeSession("nonexistent")
    assert.strictEqual(result, null)
  })

  it("resumeSession returns saved state for known id", () => {
    setTestDir()
    const id = mod.saveSession({
      summary: "resume test",
      decisions: [{ key: "val" }],
      context: "some context",
      activeFiles: ["file1.mjs", "file2.mjs"],
    })
    const result = mod.resumeSession(id)
    assert.ok(result !== null)
    assert.strictEqual(result.id, id)
    assert.strictEqual(result.summary, "resume test")
    assert.deepStrictEqual(result.decisions, [{ key: "val" }])
    assert.strictEqual(result.context, "some context")
    assert.deepStrictEqual(result.activeFiles, ["file1.mjs", "file2.mjs"])
  })

  it("resumeSession returns null for corrupted JSON", () => {
    setTestDir()
    const id = mod.saveSession({ summary: "corruptible" })
    const fp = path.join(TEST_DIR, "sessions", `${id}.json`)
    fs.writeFileSync(fp, "{not valid json}", "utf8")
    const result = mod.resumeSession(id)
    assert.strictEqual(result, null)
  })

  it("listSessions returns sessions sorted by recency", () => {
    setTestDir()
    const id1 = mod.saveSession({ summary: "older", timestamp: "2020-01-01T00:00:00.000Z" })
    const id2 = mod.saveSession({ summary: "newer", timestamp: "2025-01-01T00:00:00.000Z" })
    const list = mod.listSessions(10)
    assert.strictEqual(list.length, 2)
    assert.strictEqual(list[0].summary, "newer")
    assert.strictEqual(list[1].summary, "older")
  })

  it("listSessions respects limit parameter", () => {
    setTestDir()
    mod.saveSession({ summary: "a" })
    mod.saveSession({ summary: "b" })
    const list = mod.listSessions(1)
    assert.strictEqual(list.length, 1)
  })

  it("listSessions returns empty array for empty directory", () => {
    setTestDir()
    const list = mod.listSessions(10)
    assert.deepStrictEqual(list, [])
  })

  it("listSessions skips corrupted JSON files", () => {
    setTestDir()
    mod.saveSession({ summary: "valid" })
    fs.writeFileSync(path.join(TEST_DIR, "sessions", "bad.json"), "{bad}", "utf8")
    const list = mod.listSessions(10)
    assert.strictEqual(list.length, 1)
    assert.strictEqual(list[0].summary, "valid")
  })

  it("listSessions handles missing timestamp gracefully", () => {
    setTestDir()
    const id = mod.saveSession({ summary: "no-ts" })
    const fp = path.join(TEST_DIR, "sessions", `${id}.json`)
    const data = JSON.parse(fs.readFileSync(fp, "utf8"))
    delete data.timestamp
    fs.writeFileSync(fp, JSON.stringify(data), "utf8")
    const list = mod.listSessions(10)
    assert.strictEqual(list.length, 1)
    assert.strictEqual(list[0].timestamp, "")
  })

  it("pruneSessions removes old sessions", () => {
    setTestDir()
    const id = mod.saveSession({ summary: "old" })
    const fp = path.join(TEST_DIR, "sessions", `${id}.json`)
    const past = new Date(Date.now() - 10 * 86400000)
    fs.utimesSync(fp, past, past)
    const deleted = mod.pruneSessions(7)
    assert.strictEqual(deleted, 1)
    assert.ok(!fs.existsSync(fp))
  })

  it("pruneSessions does not remove recent sessions", () => {
    setTestDir()
    mod.saveSession({ summary: "recent" })
    const deleted = mod.pruneSessions(30)
    assert.strictEqual(deleted, 0)
    assert.strictEqual(mod.listSessions(10).length, 1)
  })

  it("pruneSessions returns 0 for empty directory", () => {
    setTestDir()
    const deleted = mod.pruneSessions(7)
    assert.strictEqual(deleted, 0)
  })
})
