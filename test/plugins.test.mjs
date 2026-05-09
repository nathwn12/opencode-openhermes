import { describe, it } from "node:test"
import assert from "node:assert/strict"

describe("plugin exports", () => {
  it("index.mjs exports all 4 plugins", async () => {
    const pkg = await import("../index.mjs")
    assert.ok(typeof pkg.AutorecallPlugin === "function")
    assert.ok(typeof pkg.CuratorPlugin === "function")
    assert.ok(typeof pkg.SkillBuilderPlugin === "function")
    assert.ok(typeof pkg.BootstrapPlugin === "function")
  })

  it("autorecall.mjs exports AutorecallPlugin", async () => {
    const mod = await import("../autorecall.mjs")
    assert.ok(typeof mod.AutorecallPlugin === "function")
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
