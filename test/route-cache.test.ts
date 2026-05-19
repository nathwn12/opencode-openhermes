import { describe, it, before, after } from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import os from "node:os"
import { RouteCache, type CachedSkillMeta } from "../harness/lib/routing/route-cache.ts"
import { readSkillFrontmatter } from "../harness/lib/routing/skill-frontmatter.ts"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeTempDir(): string {
  return fs.mkdtempSync(path.join(fs.realpathSync(os.tmpdir()), "oh-route-cache-"))
}

function findEntry(cache: RouteCache, name: string): CachedSkillMeta | undefined {
  for (const [n, meta] of cache.entries()) {
    if (n === name) return meta
  }
  return undefined
}

function writeSkill(root: string, name: string, frontmatter: Record<string, string>, route?: Record<string, string | string[]>): void {
  const dir = path.join(root, name)
  fs.mkdirSync(dir, { recursive: true })

  const lines = ["---"]
  const fm = { ...frontmatter }
  if (fm.name === undefined) fm.name = name
  for (const [k, v] of Object.entries(fm)) {
    lines.push(`${k}: ${v}`)
  }
  if (route) {
    lines.push("route:")
    for (const [k, v] of Object.entries(route)) {
      if (Array.isArray(v)) {
        if (v.length === 0) {
          lines.push(`  ${k}: []`)
        } else if (v.length === 1) {
          lines.push(`  ${k}: ${v[0]}`)
        } else if (v.every(s => !s.includes(" "))) {
          // Inline array format for short strings
          lines.push(`  ${k}: [${v.join(", ")}]`)
        } else {
          lines.push(`  ${k}:`)
          for (const item of v) {
            lines.push(`    - ${item}`)
          }
        }
      } else {
        lines.push(`  ${k}: ${v}`)
      }
    }
  }
  lines.push("---")
  lines.push("")

  fs.writeFileSync(path.join(dir, "SKILL.md"), lines.join("\n"))
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("RouteCache", () => {
  let tmpDir: string
  let builtinDir: string
  let userDir: string

  before(() => {
    tmpDir = makeTempDir()
    builtinDir = path.join(tmpDir, "builtin", "skills")
    userDir = path.join(tmpDir, "user", "skills")
    fs.mkdirSync(builtinDir, { recursive: true })
    fs.mkdirSync(userDir, { recursive: true })
  })

  after(() => {
    RouteCache.resetInstance()
    if (tmpDir && fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true })
    }
  })

  // -----------------------------------------------------------------------
  // 1. initialize() with real OH skills dir — all 33+ skills cached
  // -----------------------------------------------------------------------
  it("caches all real OH skills with valid frontmatter", () => {
    RouteCache.resetInstance()
    const cache = RouteCache.getInstance()
    const realSkillsDir = path.resolve(import.meta.dirname, "..", "harness", "skills")
    cache.initialize(realSkillsDir, [])

    // Should have at least 33 entries
    let count = 0
    for (const _ of cache.entries()) {
      count++
    }
    assert.ok(count >= 33, `Expected >= 33 cached skills, got ${count}`)

    // Each entry has valid frontmatter with name, description, and route
    for (const [name, meta] of cache.entries()) {
      assert.ok(meta.frontmatter.name, `${name} should have frontmatter name`)
      assert.ok(meta.frontmatter.description, `${name} should have description`)
      assert.ok(meta.frontmatter.route, `${name} should have route`)
      assert.ok(Array.isArray(meta.frontmatter.route.pass), `${name} route.pass should be array`)
      assert.ok(Array.isArray(meta.frontmatter.route.fail), `${name} route.fail should be array`)
      assert.ok(Array.isArray(meta.frontmatter.route.blocker), `${name} route.blocker should be array`)
      assert.ok(typeof meta.sourcePath === "string", `${name} should have sourcePath`)
    }
  })

  // -----------------------------------------------------------------------
  // 2. Cache hit — get() returns same data as reading directly
  // -----------------------------------------------------------------------
  it("get() returns same frontmatter as readSkillFrontmatter", () => {
    RouteCache.resetInstance()
    const cache = RouteCache.getInstance()
    const realSkillsDir = path.resolve(import.meta.dirname, "..", "harness", "skills")
    cache.initialize(realSkillsDir, [])

    // Spot-check a few skills
    for (const name of ["oh-planner", "oh-builder", "oh-gauntlet", "oh-ship"]) {
      const cached = cache.get(name)
      assert.ok(cached, `${name} should be cached`)

      const meta = findEntry(cache, name)
      assert.ok(meta, `${name} should exist in entries`)
      const direct = readSkillFrontmatter(meta.sourcePath)
      assert.ok(direct, `${name} should be readable from disk`)

      assert.deepEqual(cached, direct, `${name} cached frontmatter should match disk`)
    }
  })

  // -----------------------------------------------------------------------
  // 3. Cache miss — unknown skill returns undefined
  // -----------------------------------------------------------------------
  it("get() returns undefined for unknown skill", () => {
    RouteCache.resetInstance()
    const cache = RouteCache.getInstance()
    const realSkillsDir = path.resolve(import.meta.dirname, "..", "harness", "skills")
    cache.initialize(realSkillsDir, [])

    assert.equal(cache.get("nonexistent-skill"), undefined)
    assert.equal(cache.getRouteMap("nonexistent-skill"), undefined)
    assert.equal(cache.has("nonexistent-skill"), false)
  })

  // -----------------------------------------------------------------------
  // 4. getRouteMap() returns just the route portion
  // -----------------------------------------------------------------------
  it("getRouteMap() returns correct route map", () => {
    RouteCache.resetInstance()
    const cache = RouteCache.getInstance()
    const realSkillsDir = path.resolve(import.meta.dirname, "..", "harness", "skills")
    cache.initialize(realSkillsDir, [])

    const routeMap = cache.getRouteMap("oh-planner")
    assert.ok(routeMap, "oh-planner should have route map")
    assert.ok(Array.isArray(routeMap!.pass), "route.pass should be array")
    assert.ok(Array.isArray(routeMap!.fail), "route.fail should be array")
    assert.ok(Array.isArray(routeMap!.blocker), "route.blocker should be array")

    // Verify it's the same route portion from full frontmatter
    const full = cache.get("oh-planner")
    assert.deepEqual(routeMap, full!.route, "getRouteMap should match frontmatter.route")
  })

  // -----------------------------------------------------------------------
  // 5. invalidate(skillName) clears only that entry
  // -----------------------------------------------------------------------
  it("invalidate(skillName) clears specific entry only", () => {
    RouteCache.resetInstance()
    const cache = RouteCache.getInstance()
    const realSkillsDir = path.resolve(import.meta.dirname, "..", "harness", "skills")
    cache.initialize(realSkillsDir, [])

    assert.ok(cache.has("oh-planner"), "oh-planner should be cached before invalidation")
    assert.ok(cache.has("oh-builder"), "oh-builder should be cached before invalidation")

    cache.invalidate("oh-planner")

    assert.equal(cache.has("oh-planner"), false, "oh-planner should be removed")
    assert.ok(cache.has("oh-builder"), "oh-builder should still be cached")
  })

  // -----------------------------------------------------------------------
  // 6. invalidate() (no args) clears everything
  // -----------------------------------------------------------------------
  it("invalidate() with no args clears all entries", () => {
    RouteCache.resetInstance()
    const cache = RouteCache.getInstance()
    const realSkillsDir = path.resolve(import.meta.dirname, "..", "harness", "skills")
    cache.initialize(realSkillsDir, [])

    let countBefore = 0
    for (const _ of cache.entries()) {
      countBefore++
    }
    assert.ok(countBefore >= 33, "should have cached entries before clear")

    cache.invalidate()

    let countAfter = 0
    for (const _ of cache.entries()) {
      countAfter++
    }
    assert.equal(countAfter, 0, "all entries should be cleared after invalidate()")
    assert.equal(cache.has("oh-planner"), false, "oh-planner should not exist after clear")
  })

  // -----------------------------------------------------------------------
  // 7. Later user dirs override built-in names
  // -----------------------------------------------------------------------
  it("user dirs override built-in skills on name conflict", () => {
    RouteCache.resetInstance()
    const cache = RouteCache.getInstance()
    const realSkillsDir = path.resolve(import.meta.dirname, "..", "harness", "skills")

    // Create a user override for oh-planner
    writeSkill(userDir, "oh-planner", {
      name: "oh-planner",
      description: "User overridden planner",
      tier: "3",
    }, { pass: "surface", fail: "oh-builder", blocker: "surface" })

    cache.initialize(realSkillsDir, [userDir])

    const overridden = cache.get("oh-planner")
    assert.ok(overridden, "oh-planner should be cached")
    assert.equal(overridden!.description, "User overridden planner",
      "User dir should override built-in description")
    assert.deepEqual(overridden!.route.pass, ["surface"],
      "User dir should override built-in routes")
  })

  // -----------------------------------------------------------------------
  // 8. Missing/empty dirs don't crash initialize
  // -----------------------------------------------------------------------
  it("missing and empty dirs do not crash initialize", () => {
    RouteCache.resetInstance()
    const cache = RouteCache.getInstance()
    const realSkillsDir = path.resolve(import.meta.dirname, "..", "harness", "skills")

    const missingDir = path.join(tmpDir, "does-not-exist")
    const emptyDir = path.join(tmpDir, "empty")
    fs.mkdirSync(emptyDir, { recursive: true })

    // Should not throw with missing or empty dirs
    assert.doesNotThrow(() => {
      cache.initialize(realSkillsDir, [missingDir, emptyDir])
    })

    // Should still have cached the real skills
    assert.ok(cache.has("oh-planner"), "real skills should still be cached")
    assert.ok(cache.has("oh-builder"), "real skills should still be cached")
  })
})
