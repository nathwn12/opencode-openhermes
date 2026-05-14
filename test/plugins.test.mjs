import { describe, it, before } from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"

describe("plugin exports", () => {
  it("index.mjs default exports plugin", async () => {
    const pkg = await import("../index.mjs")
    assert.ok(typeof pkg.default === "function")
  })

  it("bootstrap.mjs exports BootstrapPlugin", async () => {
    const mod = await import("../bootstrap.mjs")
    assert.ok(typeof mod.BootstrapPlugin === "function")
  })
})

describe("bootstrap helpers", () => {
  let mod

  before(async () => {
    mod = await import("../bootstrap.mjs")
  })

  it("re-exports harness resolver helpers", async () => {
    const { resolveHarnessRoot, setHarnessRootForTest, getHarnessDir } = mod
    assert.ok(typeof resolveHarnessRoot === "function")
    assert.ok(typeof setHarnessRootForTest === "function")
    assert.ok(typeof getHarnessDir === "function")
  })

  it("resolveHarnessRoot picks complete harness root", async () => {
    const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "openhermes-harness-"))
    const badRoot = path.join(tmpRoot, "bad")
    const goodRoot = path.join(tmpRoot, "good")

    fs.mkdirSync(path.join(badRoot, "codex"), { recursive: true })
    fs.writeFileSync(path.join(badRoot, "codex", "CONSTITUTION.md"), "# incomplete\n")

    const requiredFiles = [
      ["codex", "CONSTITUTION.md"],
      ["instructions", "RUNTIME.md"],
      ["skills", "oh-plan", "SKILL.md"],
    ]

    for (const parts of requiredFiles) {
      const filePath = path.join(goodRoot, ...parts)
      fs.mkdirSync(path.dirname(filePath), { recursive: true })
      fs.writeFileSync(filePath, "ok\n")
    }

    const resolved = mod.resolveHarnessRoot({ candidateRoots: [badRoot, goodRoot] })
    assert.equal(resolved, goodRoot)
  })

  it("setHarnessRootForTest overrides harness resolution", async () => {
    mod.setHarnessRootForTest("/custom/harness")
    assert.equal(mod.getHarnessDir(), "/custom/harness")
    mod.setHarnessRootForTest(undefined)
  })
})
