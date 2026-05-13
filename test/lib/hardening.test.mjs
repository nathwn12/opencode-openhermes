import { describe, it, before, after } from "node:test"
import assert from "node:assert/strict"
import path from "node:path"
import fs from "node:fs"
import os from "node:os"

const {
  atomicWriteJson, fingerprintEnvironment,
  redactSensitiveText, sanitizeRecord, truncateText
} = await import("../../lib/hardening.mjs")

describe("truncateText", () => {
  it("returns string unchanged when under limit", () => {
    assert.equal(truncateText("hello", 100), "hello")
  })
  it("truncates and appends suffix when over limit", () => {
    const result = truncateText("hello world this is a test", 20)
    assert.ok(result.endsWith("...[truncated]"), `got: "${result}"`)
    assert.equal(result, "hello ...[truncated]")
  })
  it("handles null/undefined as empty string", () => {
    assert.equal(truncateText(null, 100), "")
    assert.equal(truncateText(undefined, 100), "")
  })
  it("returns original string when limit is 0 or negative", () => {
    assert.equal(truncateText("hello", 0), "hello")
    assert.equal(truncateText("hello", -1), "hello")
  })
})

describe("redactSensitiveText", () => {
  it("redacts sk- API keys", () => {
    const result = redactSensitiveText("sk-abc123xyz456def789ghi")
    assert.ok(result.includes("[REDACTED]"))
    assert.ok(!result.includes("sk-abc123xyz456def789ghi"))
  })
  it("redacts GitHub tokens", () => {
    const result = redactSensitiveText("ghp_abc123def456ghi789jkl012")
    assert.ok(result.includes("[REDACTED]"))
  })
  it("redacts Bearer tokens", () => {
    const result = redactSensitiveText("Authorization: Bearer abc123.def456.ghi789")
    assert.ok(result.includes("Bearer [REDACTED]"))
  })
  it("redacts JWT-like tokens with 20+ char segments", () => {
    const result = redactSensitiveText("token eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNqPZNUcOqYsssssssss")
    assert.ok(result.includes("[REDACTED]"))
  })
  it("passes through safe text unchanged", () => {
    const result = redactSensitiveText("hello world this is safe")
    assert.equal(result, "hello world this is safe")
  })
})

describe("sanitizeRecord", () => {
  it("redacts keys matching secret patterns", () => {
    const record = { api_key: "secret123", name: "test" }
    const result = sanitizeRecord(record)
    assert.equal(result.api_key, "[REDACTED]")
    assert.equal(result.name, "test")
  })
  it("truncates long strings", () => {
    const long = "x".repeat(5000)
    const record = { data: long }
    const result = sanitizeRecord(record, { maxStringLength: 100 })
    assert.ok(result.data.length < 150)
  })
  it("preserves numbers and booleans", () => {
    const record = { count: 42, active: true, score: 3.14 }
    const result = sanitizeRecord(record)
    assert.equal(result.count, 42)
    assert.equal(result.active, true)
    assert.equal(result.score, 3.14)
  })
  it("handles arrays", () => {
    const record = { items: ["a", "b", "c"] }
    const result = sanitizeRecord(record)
    assert.deepEqual(result.items, ["a", "b", "c"])
  })
  it("handles null values", () => {
    const record = { nullable: null }
    const result = sanitizeRecord(record)
    assert.equal(result.nullable, null)
  })
})

describe("fingerprintEnvironment", () => {
  it("returns fingerprint with sha256", () => {
    const fp = fingerprintEnvironment({ cwd: "/test", project: "test" })
    assert.ok(typeof fp.sha256 === "string")
    assert.equal(fp.sha256.length, 64)
    assert.equal(fp.cwd, path.resolve("/test"))
  })
  it("includes platform info", () => {
    const fp = fingerprintEnvironment({ cwd: process.cwd() })
    assert.equal(fp.os, process.platform)
  })
})

describe("atomicWriteJson", () => {
  let tmpDir
  before(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "oh-test-"))
  })
  after(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true })
  })
  it("writes valid JSON file", () => {
    const fp = path.join(tmpDir, "test.json")
    const data = { hello: "world", num: 42 }
    atomicWriteJson(fp, data)
    const content = JSON.parse(fs.readFileSync(fp, "utf8"))
    assert.deepEqual(content, data)
  })
  it("creates parent directories", () => {
    const fp = path.join(tmpDir, "sub", "nested", "test.json")
    atomicWriteJson(fp, { key: "val" })
    assert.ok(fs.existsSync(fp))
  })
})
