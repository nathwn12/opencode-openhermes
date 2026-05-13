import { describe, it, before } from "node:test"
import assert from "node:assert/strict"

describe("search scoring", () => {
  let scoreRelevance

  before(async () => {
    const mod = await import("../lib/search.mjs")
    scoreRelevance = mod.scoreRelevance
  })

  it("returns 0 for empty query", () => {
    const r = { summary: "hello world" }
    assert.equal(scoreRelevance(r, "", "test"), 0)
    assert.equal(scoreRelevance(r, "a", "test"), 0)
  })

  it("returns positive score when summary matches query", () => {
    const r = { summary: "database connection timeout", id: "test-1" }
    assert.ok(scoreRelevance(r, "database", "test") > 0)
  })

  it("scores project match higher than no project match", () => {
    const matching = { summary: "fix login bug", project: "myapp", id: "match" }
    const nonMatching = { summary: "fix login bug", project: "other", id: "nomatch" }
    const score1 = scoreRelevance(matching, "login", "myapp")
    const score2 = scoreRelevance(nonMatching, "login", "myapp")
    assert.ok(score1 > score2)
  })

  it("gives recency bonus for recent records", () => {
    const recent = { summary: "recent item", updated_at: new Date().toISOString(), id: "r1" }
    const old = { summary: "recent item", updated_at: "2020-01-01T00:00:00.000Z", id: "r2" }
    const scoreRecent = scoreRelevance(recent, "recent", "")
    const scoreOld = scoreRelevance(old, "recent", "")
    assert.ok(scoreRecent >= scoreOld)
  })

  it("gives bonus for active status", () => {
    const active = { summary: "test record", status: "active", id: "a1" }
    const closed = { summary: "test record", status: "closed", id: "a2" }
    const scoreActive = scoreRelevance(active, "test", "")
    const scoreClosed = scoreRelevance(closed, "test", "")
    assert.ok(scoreActive > scoreClosed)
  })

  it("matches tokens longer than 2 chars", () => {
    const r = { summary: "the api endpoint failed", id: "tok-1" }
    const scoreFull = scoreRelevance(r, "api endpoint failed", "")
    const scoreShort = scoreRelevance(r, "a an", "")
    assert.ok(scoreFull > 0)
    assert.equal(scoreShort, 0)
  })

  it("scans description and mission fields", () => {
    const r = { description: "critical security patch applied", id: "desc-1", updated_at: new Date().toISOString(), status: "active" }
    assert.ok(scoreRelevance(r, "security", "") > 0)
  })

  it("scans tags as list fields", () => {
    const r = { summary: "item", tags: ["urgent", "security"], id: "tag-1", updated_at: new Date().toISOString(), status: "active" }
    assert.ok(scoreRelevance(r, "urgent", "") > 0)
  })

  it("handles records with only id and no other fields", () => {
    const r = { id: "orphan-1" }
    assert.equal(scoreRelevance(r, "anything", ""), 0)
  })
})
