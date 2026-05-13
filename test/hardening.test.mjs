import { describe, it, before } from "node:test"
import assert from "node:assert/strict"

describe("hardening utilities", () => {
  let hasExpired, isTruthy

  before(async () => {
    const mod = await import("../lib/hardening.mjs")
    hasExpired = mod.hasExpired
    isTruthy = mod.isTruthy
  })

  describe("hasExpired", () => {
    it("returns true when status is expired", () => {
      assert.equal(hasExpired({ status: "expired" }), true)
    })

    it("returns true when status is decayed", () => {
      assert.equal(hasExpired({ status: "decayed" }), true)
    })

    it("returns true when decay_at is in the past", () => {
      assert.equal(hasExpired({ decay_at: "2020-01-01T00:00:00.000Z" }), true)
    })

    it("returns true when expires_at is in the past", () => {
      assert.equal(hasExpired({ expires_at: "2020-01-01T00:00:00.000Z" }), true)
    })

    it("returns false when no expiry fields are set", () => {
      assert.equal(hasExpired({ status: "active" }), false)
    })

    it("returns false when null or undefined is passed", () => {
      assert.equal(hasExpired(null), false)
      assert.equal(hasExpired(undefined), false)
    })

    it("returns false when decay_at is in the future", () => {
      const future = new Date(Date.now() + 86400000).toISOString()
      assert.equal(hasExpired({ decay_at: future }), false)
    })

    it("returns false when expires_at is in the future", () => {
      const future = new Date(Date.now() + 86400000).toISOString()
      assert.equal(hasExpired({ expires_at: future }), false)
    })

    it("returns true if decay_at is parseable and in the past", () => {
      assert.equal(hasExpired({ decay_at: "1999-12-31T23:59:59.000Z" }), true)
    })
  })

  describe("isTruthy", () => {
    ;["1", "true", "yes", "on", "TRUE", "Yes", "ON"].forEach(v => {
      it(`returns true for "${v}"`, () => {
        assert.equal(isTruthy(v), true)
      })
    })

    ;["0", "false", "no", "off", "", undefined, null, "random"].forEach(v => {
      it(`returns false for ${v === null ? "null" : v === undefined ? "undefined" : `"${v}"`}`, () => {
        assert.equal(isTruthy(v), false)
      })
    })

    it("handles numeric values", () => {
      assert.equal(isTruthy(1), true)
      assert.equal(isTruthy(0), false)
    })

    it("does not trim whitespace (implementation detail)", () => {
      assert.equal(isTruthy("  1  "), false)
      assert.equal(isTruthy("  true  "), false)
    })
  })
})
