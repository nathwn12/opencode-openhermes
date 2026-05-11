import { describe, it } from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"

describe("plugin exports", () => {
  it("index.mjs default exports merged plugin", async () => {
    const pkg = await import("../index.mjs")
    assert.ok(typeof pkg.default === "function")
  })

  it("autorecall.mjs exports AutorecallPlugin and refreshRecallCache", async () => {
    const mod = await import("../autorecall.mjs")
    assert.ok(typeof mod.AutorecallPlugin === "function")
    assert.ok(typeof mod.refreshRecallCache === "function")
  })

  it("curator.mjs exports CuratorPlugin", async () => {
    const mod = await import("../curator.mjs")
    assert.ok(typeof mod.CuratorPlugin === "function")
  })

  it("skill-builder.mjs exports SkillBuilderPlugin", async () => {
    const mod = await import("../skill-builder.mjs")
    assert.ok(typeof mod.SkillBuilderPlugin === "function")
  })

  it("bootstrap.mjs exports BootstrapPlugin", async () => {
    const mod = await import("../bootstrap.mjs")
    assert.ok(typeof mod.BootstrapPlugin === "function")
  })

  it("lib/ambient-memory.mjs exports AmbientMemoryPlugin", async () => {
    const mod = await import("../lib/ambient-memory.mjs")
    assert.ok(typeof mod.AmbientMemoryPlugin === "function")
  })

  it("lib/ohc/pruner.mjs exports OhcPlugin", async () => {
    const mod = await import("../lib/ohc/pruner.mjs")
    assert.ok(typeof mod.OhcPlugin === "function")
  })

  it("lib/ohc/config.mjs loads config", async () => {
    const { loadConfig } = await import("../lib/ohc/config.mjs")
    const cfg = loadConfig()
    assert.ok(typeof cfg.enabled === "boolean")
    assert.ok(typeof cfg.min === "number")
  })
})

describe("plugin structure", () => {
  it("AutorecallPlugin returns event hook", async () => {
    const plugin = await AutorecallPlugin({ project: {}, directory: process.cwd() })
    assert.ok(typeof plugin.event === "function")
  })

  it("SkillBuilderPlugin returns event + tool.execute.after hooks", async () => {
    const plugin = await SkillBuilderPlugin({ project: {}, directory: process.cwd() })
    assert.ok(typeof plugin.event === "function")
    assert.ok(typeof plugin["tool.execute.after"] === "function")
  })

  it("CuratorPlugin returns event + experimental.session.compacting hooks", async () => {
    const plugin = await CuratorPlugin({ project: {}, directory: process.cwd() })
    assert.ok(typeof plugin.event === "function")
    assert.ok(typeof plugin["experimental.session.compacting"] === "function")
  })

  it("BootstrapPlugin returns config + chat.transform hooks", async () => {
    const plugin = await BootstrapPlugin({ client: {}, directory: process.cwd() })
    assert.ok(typeof plugin.config === "function")
    assert.ok(typeof plugin["experimental.chat.messages.transform"] === "function")
  })

  it("OhcPlugin returns hooks + tool when enabled", async () => {
    const plugin = await OhcPlugin({})
    assert.ok(typeof plugin["experimental.chat.system.transform"] === "function")
    assert.ok(typeof plugin["experimental.chat.messages.transform"] === "function")
    assert.ok(typeof plugin["command.execute.before"] === "function")
    assert.ok(typeof plugin.tool?.compress?.execute === "function")
  })

  it("AmbientMemoryPlugin returns chat.transform hook", async () => {
    const plugin = await AmbientMemoryPlugin()
    assert.ok(typeof plugin["experimental.chat.messages.transform"] === "function")
  })

  it("resolveHarnessRoot picks a complete fallback root", async () => {
    const { resolveHarnessRoot } = await import("../bootstrap.mjs")
    const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "openhermes-harness-"))
    const badRoot = path.join(tmpRoot, "bad")
    const goodRoot = path.join(tmpRoot, "good")

    fs.mkdirSync(path.join(badRoot, "codex"), { recursive: true })
    fs.writeFileSync(path.join(badRoot, "codex", "CONSTITUTION.md"), "# incomplete\n")

    const requiredFiles = [
      ["codex", "CONSTITUTION.md"],
      ["instructions", "RUNTIME.md"],
      ["commands", "doctor.md"],
      ["prompts", "architect.txt"],
      ["rules", "precedence.md"],
      ["skills", "coding-standards", "SKILL.md"],
    ]

    for (const parts of requiredFiles) {
      const filePath = path.join(goodRoot, ...parts)
      fs.mkdirSync(path.dirname(filePath), { recursive: true })
      fs.writeFileSync(filePath, "ok\n")
    }

    const resolved = resolveHarnessRoot({ candidateRoots: [badRoot, goodRoot] })
    assert.equal(resolved, goodRoot)
  })

  it("findCacheDirs scans packages and node_modules caches", async () => {
    const { findCacheDirs } = await import("../lib/ohc/updater.mjs")
    const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "openhermes-cache-"))
    const packagesRoot = path.join(tmpRoot, "packages")
    const nodeModulesRoot = path.join(tmpRoot, "node_modules")
    const pkgCache = path.join(packagesRoot, "openhermes@git+https_foo")
    const nestedCache = path.join(nodeModulesRoot, "cache", "openhermes")

    fs.mkdirSync(pkgCache, { recursive: true })
    fs.mkdirSync(nestedCache, { recursive: true })
    fs.mkdirSync(path.join(nodeModulesRoot, "keep", "not-openhermes"), { recursive: true })

    const found = findCacheDirs({ cacheRoots: [packagesRoot, nodeModulesRoot] })
    assert.deepEqual(
      found.map(entry => entry.path).sort(),
      [pkgCache, nestedCache].sort(),
    )
  })
})

async function AutorecallPlugin(ctx) {
  const mod = await import("../autorecall.mjs")
  return mod.AutorecallPlugin(ctx)
}
async function SkillBuilderPlugin(ctx) {
  const mod = await import("../skill-builder.mjs")
  return mod.SkillBuilderPlugin(ctx)
}
async function CuratorPlugin(ctx) {
  const mod = await import("../curator.mjs")
  return mod.CuratorPlugin(ctx)
}
async function BootstrapPlugin(ctx) {
  const mod = await import("../bootstrap.mjs")
  return mod.BootstrapPlugin(ctx)
}
async function OhcPlugin(ctx) {
  const mod = await import("../lib/ohc/pruner.mjs")
  return mod.OhcPlugin(ctx)
}
async function AmbientMemoryPlugin() {
  const mod = await import("../lib/ambient-memory.mjs")
  return mod.AmbientMemoryPlugin()
}
