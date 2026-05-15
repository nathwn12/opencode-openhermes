import { describe, it, before } from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"

describe("plugin exports", () => {
  it("index.ts default exports plugin", async () => {
    const pkg = await import("../index.ts")
    assert.ok(typeof pkg.default === "function")
  })

  it("bootstrap.ts exports BootstrapPlugin", async () => {
    const mod = await import("../bootstrap.ts")
    assert.ok(typeof mod.BootstrapPlugin === "function")
  })
})

describe("bootstrap helpers", () => {
  let mod: Record<string, unknown>

  before(async () => {
    mod = await import("../bootstrap.ts")
  })

  it("re-exports harness resolver helpers", async () => {
    const { resolveHarnessRoot, setHarnessRootForTest, getHarnessDir } = mod as {
      resolveHarnessRoot: unknown
      setHarnessRootForTest: unknown
      getHarnessDir: unknown
    }
    assert.ok(typeof resolveHarnessRoot === "function")
    assert.ok(typeof setHarnessRootForTest === "function")
    assert.ok(typeof getHarnessDir === "function")
  })

  it("resolveHarnessRoot picks complete harness root", async () => {
    const { resolveHarnessRoot } = mod as { resolveHarnessRoot: (opts: { candidateRoots: string[] }) => string }
    const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "openhermes-harness-"))
    const badRoot = path.join(tmpRoot, "bad")
    const goodRoot = path.join(tmpRoot, "good")

    fs.mkdirSync(path.join(badRoot, "codex"), { recursive: true })
    fs.writeFileSync(path.join(badRoot, "codex", "CONSTITUTION.md"), "# incomplete\n")

    const requiredFiles: ReadonlyArray<readonly string[]> = [
      ["codex", "CONSTITUTION.md"],
      ["instructions", "RUNTIME.md"],
      ["skills", "oh-plan", "SKILL.md"],
    ]

    for (const parts of requiredFiles) {
      const filePath = path.join(goodRoot, ...parts)
      fs.mkdirSync(path.dirname(filePath), { recursive: true })
      fs.writeFileSync(filePath, "ok\n")
    }

    const resolved = resolveHarnessRoot({ candidateRoots: [badRoot, goodRoot] })
    assert.equal(resolved, goodRoot)
  })

  it("setHarnessRootForTest overrides harness resolution", async () => {
    const modTyped = mod as {
      setHarnessRootForTest: (dir: string | undefined) => void
      getHarnessDir: () => string
    }
    modTyped.setHarnessRootForTest("/custom/harness")
    assert.equal(modTyped.getHarnessDir(), "/custom/harness")
    modTyped.setHarnessRootForTest(undefined)
  })
})
