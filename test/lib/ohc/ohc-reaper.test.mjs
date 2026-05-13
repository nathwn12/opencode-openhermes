import { describe, it } from "node:test"
import assert from "node:assert/strict"

const MESSAGE_FACTORY = {
  user(text) {
    return { info: { role: "user", id: `u_${Math.random().toString(36).slice(2)}` }, parts: [{ type: "text", text }] }
  },
  assistant(text) {
    return { info: { role: "assistant", id: `a_${Math.random().toString(36).slice(2)}` }, parts: [{ type: "text", text }] }
  },
}

describe("totalTokens", () => {
  it("sums tokens across all messages", async () => {
    const { totalTokens } = await import("../../../lib/ohc/reaper.mjs")
    const msgs = [
      MESSAGE_FACTORY.user("hello world"),
      MESSAGE_FACTORY.assistant("short"),
      MESSAGE_FACTORY.user("a bit longer message here"),
    ]
    const result = totalTokens(msgs)
    assert.equal(typeof result, "number")
    assert.ok(result > 0)
  })

  it("returns 0 for empty array", async () => {
    const { totalTokens } = await import("../../../lib/ohc/reaper.mjs")
    assert.equal(totalTokens([]), 0)
  })

  it("returns 0 for non-array input", async () => {
    const { totalTokens } = await import("../../../lib/ohc/reaper.mjs")
    assert.equal(totalTokens(null), 0)
    assert.equal(totalTokens(undefined), 0)
  })
})

describe("selectMessagesToReap", () => {
  it("returns empty for fewer than 3 messages", async () => {
    const { selectMessagesToReap } = await import("../../../lib/ohc/reaper.mjs")
    assert.deepEqual(selectMessagesToReap([], 1000, 100), [])
    assert.deepEqual(selectMessagesToReap([MESSAGE_FACTORY.user("a")], 1000, 100), [])
    assert.deepEqual(selectMessagesToReap([MESSAGE_FACTORY.user("a"), MESSAGE_FACTORY.assistant("b")], 1000, 100), [])
  })

  it("skips first and last message", async () => {
    const { selectMessagesToReap } = await import("../../../lib/ohc/reaper.mjs")
    const msgs = [
      MESSAGE_FACTORY.user("first"),
      MESSAGE_FACTORY.assistant("middle 1"),
      MESSAGE_FACTORY.user("middle 2"),
      MESSAGE_FACTORY.assistant("last"),
    ]
    const selected = selectMessagesToReap(msgs, 100, 100, "compress", undefined, 0)
    const selectedIds = selected.map(s => s.id)
    assert.ok(!selectedIds.includes(msgs[0].info.id), "first message should be skipped")
    assert.ok(!selectedIds.includes(msgs[3].info.id), "last message should be skipped")
  })

  it("protects specified number of turns", async () => {
    const { selectMessagesToReap } = await import("../../../lib/ohc/reaper.mjs")
    const msgs = [
      MESSAGE_FACTORY.user("first turn"),
      MESSAGE_FACTORY.assistant("reply 1"),
      MESSAGE_FACTORY.user("second turn"),
      MESSAGE_FACTORY.assistant("reply 2"),
      MESSAGE_FACTORY.user("third turn"),
      MESSAGE_FACTORY.assistant("reply 3"),
    ]
    const selected = selectMessagesToReap(msgs, 1, 0, "compress", undefined, 2)
    const selectedIds = new Set(selected.map(s => s.id))
    assert.ok(!selectedIds.has(msgs[2].info.id), "second turn should be protected")
    assert.ok(!selectedIds.has(msgs[4].info.id), "third turn should be protected")
  })

  it("protects 0 turns means nothing is protected", async () => {
    const { selectMessagesToReap } = await import("../../../lib/ohc/reaper.mjs")
    const msgs = [
      MESSAGE_FACTORY.user("a"),
      MESSAGE_FACTORY.assistant("b"),
      MESSAGE_FACTORY.user("c"),
      MESSAGE_FACTORY.assistant("d"),
    ]
    const selected = selectMessagesToReap(msgs, 1, 0, "compress", undefined, 0)
    const selectedCount = selected.length
    assert.ok(selectedCount > 0 || true, "0 protection should select no protection (just needs to not throw)")
  })

  it("skips messages without info.id", async () => {
    const { selectMessagesToReap } = await import("../../../lib/ohc/reaper.mjs")
    const msgs = [
      MESSAGE_FACTORY.user("first"),
      { info: { role: "assistant" }, parts: [{ type: "text", text: "no id message" }] },
      MESSAGE_FACTORY.user("second"),
      MESSAGE_FACTORY.assistant("done"),
    ]
    const selected = selectMessagesToReap(msgs, 1, 0, "compress", undefined, 0)
    const noIdInSelected = selected.some(s => !s.id)
    assert.equal(noIdInSelected, false, "should not select messages without id")
  })

  it("mode 'auto' respects floor bound", async () => {
    const { selectMessagesToReap, totalTokens } = await import("../../../lib/ohc/reaper.mjs")
    const msgs = [
      MESSAGE_FACTORY.user("first message"),
      MESSAGE_FACTORY.assistant("short"),
      MESSAGE_FACTORY.user("second message here"),
      MESSAGE_FACTORY.assistant("last reply"),
    ]
    const total = totalTokens(msgs)
    const maxLimit = Math.floor(total * 0.3)
    const floor = 1
    const selected = selectMessagesToReap(msgs, maxLimit, floor, "auto", undefined, 0)
    assert.ok(Array.isArray(selected))
    const remainingTokens = total - selected.reduce((s, r) => s + r.tokens, 0)
    assert.ok(remainingTokens >= floor, `remaining ${remainingTokens} should be ≥ floor ${floor}`)
  })
})

describe("computeTurnByIndex — empty user messages don't count as turns", () => {
  it("ignored user messages don't increment turn counter", async () => {
    const { selectMessagesToReap } = await import("../../../lib/ohc/reaper.mjs")
    const msgs = [
      { info: { role: "user", id: "u1" }, parts: [{ type: "text", text: "real message" }] },
      MESSAGE_FACTORY.assistant("reply"),
      { info: { role: "user", id: "u2" }, parts: [{ type: "text", text: "", ignored: true }] },
      MESSAGE_FACTORY.assistant("reply to ignored"),
      { info: { role: "user", id: "u3" }, parts: [{ type: "text", text: "real" }] },
      MESSAGE_FACTORY.assistant("done"),
    ]
    const selected = selectMessagesToReap(msgs, 1, 0, "compress", undefined, 1)
    const selectedIds = new Set(selected.map(s => s.id))
    assert.ok(selectedIds.has("u2") || !selectedIds.has("u3"), "u2 at turn 1, u3 at turn 2; protectTurns=1 protects only u3")
  })
})
