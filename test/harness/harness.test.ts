// ---------------------------------------------------------------------------
// Harness infrastructure tests
// ---------------------------------------------------------------------------

import { describe, it, beforeEach } from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"

import { tmpdir, tmpdirSync, createMockFs, waitFor, DirHandle, DirHandleSync } from "./fixture.ts"
import {
  resetBuilders,
  createPlan,
  createTask,
  createMemoryEntry,
  createHookMetadata,
  createRecoveryRecord,
  createSyncState,
} from "./builders.ts"
import {
  mockConsole,
  mockProcessExit,
  createMockFs as createInMemoryFs,
  createMockEmitter,
  createMockAbortController,
} from "./mocks.ts"

// ===========================================================================
// Fixture tests
// ===========================================================================

describe("tmpdir (async)", () => {
  it("creates a writable temp directory and cleans up after scope exit", async () => {
    let dirPath = ""
    {
      await using dir = await tmpdir()
      dirPath = dir.path
      assert.ok(fs.existsSync(dirPath), "temp dir should exist")
      assert.ok(dirPath.includes("oh-test-"), "default prefix is oh-test-")
      // Should be writable
      fs.writeFileSync(path.join(dirPath, "test.txt"), "hello")
      assert.equal(fs.readFileSync(path.join(dirPath, "test.txt"), "utf8"), "hello")
    }
    // After scope exit, directory should be cleaned up
    assert.ok(!fs.existsSync(dirPath), "temp dir should be removed after scope exit")
  })

  it("accepts custom prefix", async () => {
    await using dir = await tmpdir({ prefix: "my-custom-" })
    assert.ok(dir.path.includes("my-custom-"))
  })

  it("calls init hook before returning", async () => {
    let inited = false
    await using dir = await tmpdir({
      init: async (d) => {
        inited = true
        fs.writeFileSync(path.join(d, "init.txt"), "inited")
      },
    })
    assert.ok(inited)
    assert.ok(fs.existsSync(path.join(dir.path, "init.txt")))
  })

  it("calls custom dispose instead of default cleanup", async () => {
    const disposed: string[] = []
    {
      await using dir = await tmpdir({
        dispose: async (d) => {
          disposed.push(d)
          // Don't actually delete the directory — just record the call
        },
      })
      fs.writeFileSync(path.join(dir.path, "keep.txt"), "keep")
    }
    assert.equal(disposed.length, 1, "custom dispose should be called")
    assert.ok(disposed[0].length > 0, "dispose receives the dir path")
  })
})

describe("tmpdirSync", () => {
  it("creates a temp directory and cleans up on scope exit", () => {
    let dirPath = ""
    {
      using dir = tmpdirSync()
      dirPath = dir.path
      assert.ok(fs.existsSync(dirPath))
    }
    assert.ok(!fs.existsSync(dirPath), "sync temp dir cleaned after scope exit")
  })
})

describe("DirHandle / DirHandleSync", () => {
  it("DirHandle.toString() returns the path", async () => {
    await using dir = await tmpdir()
    assert.equal(String(dir), dir.path)
  })

  it("DirHandleSync.toString() returns the path", () => {
    using dir = tmpdirSync()
    assert.equal(String(dir), dir.path)
  })
})

describe("createMockFs (on disk)", () => {
  it("creates nested file tree from a structure map", async () => {
    await using dir = await tmpdir()
    await createMockFs(dir.path, {
      "a/b/c.txt": "nested",
      "root.txt": "root",
      "a/hello.txt": "hello",
    })

    assert.equal(
      fs.readFileSync(path.join(dir.path, "a", "b", "c.txt"), "utf8"),
      "nested",
    )
    assert.equal(
      fs.readFileSync(path.join(dir.path, "root.txt"), "utf8"),
      "root",
    )
    assert.equal(
      fs.readFileSync(path.join(dir.path, "a", "hello.txt"), "utf8"),
      "hello",
    )
  })

  it("handles paths with forward slashes", async () => {
    await using dir = await tmpdir()
    await createMockFs(dir.path, { "dir/file.txt": "content" })
    assert.ok(fs.existsSync(path.join(dir.path, "dir", "file.txt")))
  })
})

describe("waitFor", () => {
  it("resolves when condition becomes true", async () => {
    let flag = false
    setTimeout(() => { flag = true }, 100)
    await waitFor(() => flag, { timeout: 2000, interval: 50 })
    assert.ok(flag)
  })

  it("resolves immediately for already-true condition", async () => {
    await waitFor(() => true, { timeout: 100 })
  })

  it("rejects with clear message on timeout", async () => {
    await assert.rejects(
      () => waitFor(() => false, { timeout: 100, interval: 20, label: "never-happens" }),
      (err: Error) => {
        assert.ok(err.message.includes("timed out after 100ms"))
        assert.ok(err.message.includes("never-happens"))
        return true
      },
    )
  })

  it("async conditions work", async () => {
    let count = 0
    const result = waitFor(async () => {
      count++
      return count >= 3
    }, { timeout: 1000, interval: 30 })

    await result
    assert.ok(count >= 3)
  })

  it("uses default timeout and label", async () => {
    await assert.rejects(
      () => waitFor(() => false, { timeout: 50, interval: 10 }),
      (err: Error) => err.message.includes("condition"),
    )
  })
})

// ===========================================================================
// Builders tests
// ===========================================================================

describe("builders", () => {
  beforeEach(() => {
    resetBuilders()
  })

  describe("createPlan", () => {
    it("creates a valid default plan", () => {
      const plan = createPlan()
      assert.ok(plan.id.startsWith("plan_"))
      assert.equal(plan.title, "Test Plan")
      assert.equal(plan.status, "active")
      assert.deepEqual(plan.tasks, [])
      assert.ok(plan.created instanceof Date)
      assert.ok(plan.updated instanceof Date)
    })

    it("merges overrides", () => {
      const plan = createPlan({ title: "Custom", status: "completed" })
      assert.equal(plan.title, "Custom")
      assert.equal(plan.status, "completed")
    })

    it("produces unique IDs on successive calls", () => {
      const a = createPlan()
      const b = createPlan()
      assert.notEqual(a.id, b.id)
    })
  })

  describe("createTask", () => {
    it("creates a valid default task", () => {
      const task = createTask()
      assert.ok(task.id.startsWith("task_"))
      assert.equal(task.description, "Test task")
      assert.equal(task.status, "pending")
      assert.deepEqual(task.dependsOn, [])
    })

    it("merges overrides", () => {
      const task = createTask({ description: "Critical fix", status: "in-progress", dependsOn: ["task_1"] })
      assert.equal(task.description, "Critical fix")
      assert.equal(task.status, "in-progress")
      assert.deepEqual(task.dependsOn, ["task_1"])
    })
  })

  describe("createMemoryEntry", () => {
    it("creates a valid default memory entry", () => {
      const entry = createMemoryEntry()
      assert.ok(entry.id.startsWith("mem_"))
      assert.equal(entry.level, "info")
      assert.equal(entry.content, "Test memory entry")
      assert.ok(entry.timestamp instanceof Date)
      assert.equal(entry.importance, 0.5)
      assert.deepEqual(entry.metadata, {})
    })

    it("merges overrides", () => {
      const entry = createMemoryEntry({ level: "error", importance: 1, metadata: { source: "test" } })
      assert.equal(entry.level, "error")
      assert.equal(entry.importance, 1)
      assert.deepEqual(entry.metadata, { source: "test" })
    })
  })

  describe("createHookMetadata", () => {
    it("creates a valid default hook metadata", () => {
      const hook = createHookMetadata()
      assert.ok(hook.name.startsWith("hook_"))
      assert.equal(hook.priority, 0)
      assert.equal(hook.phase, "before")
      assert.deepEqual(hook.dependencies, [])
    })

    it("merges overrides", () => {
      const hook = createHookMetadata({ priority: 10, phase: "after", dependencies: ["other-hook"] })
      assert.equal(hook.priority, 10)
      assert.equal(hook.phase, "after")
      assert.deepEqual(hook.dependencies, ["other-hook"])
    })
  })

  describe("createRecoveryRecord", () => {
    it("creates a valid default recovery record", () => {
      const record = createRecoveryRecord()
      assert.equal(record.context, "test context")
      assert.equal(record.action, "recover")
      assert.ok(record.timestamp instanceof Date)
    })

    it("merges overrides", () => {
      const record = createRecoveryRecord({ context: "crash", action: "restart" })
      assert.equal(record.context, "crash")
      assert.equal(record.action, "restart")
    })
  })

  describe("createSyncState", () => {
    it("creates a valid default sync state", () => {
      const state = createSyncState()
      assert.deepEqual(state.entries, {})
      assert.equal(state.version, 1)
      assert.equal(state.lastWriter, "test-writer")
    })

    it("merges overrides", () => {
      const state = createSyncState({ version: 5, lastWriter: "node-2" })
      assert.equal(state.version, 5)
      assert.equal(state.lastWriter, "node-2")
    })
  })

  describe("resetBuilders", () => {
    it("resets the counter so IDs restart", () => {
      const a = createPlan()
      resetBuilders()
      const b = createPlan()

      // Counter resets to 0, so both have counter=1 (0+1).
      // Extract the counter portion between underscores.
      const aCounter = a.id.match(/_(\d+)_/)?.[1]
      const bCounter = b.id.match(/_(\d+)_/)?.[1]
      assert.equal(aCounter, "1", "first call has counter 1")
      assert.equal(bCounter, "1", "after reset, counter restarts at 1")
    })
  })
})

// ===========================================================================
// Mocks tests
// ===========================================================================

describe("mockConsole", () => {
  it("captures console.log calls", () => {
    const mock = mockConsole()
    try {
      console.log("hello", 42)
      assert.equal(mock.getLogs().length, 1)
      assert.deepEqual(mock.getLogs()[0], ["hello", 42])
    } finally {
      mock.restore()
    }
  })

  it("captures console.error calls", () => {
    const mock = mockConsole()
    try {
      console.error("error msg")
      assert.equal(mock.getErrors().length, 1)
      assert.deepEqual(mock.getErrors()[0], ["error msg"])
    } finally {
      mock.restore()
    }
  })

  it("captures console.warn calls", () => {
    const mock = mockConsole()
    try {
      console.warn("warn msg")
      assert.equal(mock.getWarns().length, 1)
    } finally {
      mock.restore()
    }
  })

  it("captures console.info calls", () => {
    const mock = mockConsole()
    try {
      console.info("info msg")
      assert.equal(mock.getInfos().length, 1)
    } finally {
      mock.restore()
    }
  })

  it("restore() restores original console functions", () => {
    const originalLog = console.log
    const mock = mockConsole()
    mock.restore()
    assert.equal(console.log, originalLog)
  })
})

describe("mockProcessExit", () => {
  it("intercepts process.exit and records exit code", () => {
    const mock = mockProcessExit()
    try {
      assert.throws(
        () => process.exit(42),
        /process\.exit\(42\)/,
      )
      assert.deepEqual(mock.getExitCodes(), [42])
    } finally {
      mock.restore()
    }
  })

  it("records exit code 0 when no code passed", () => {
    const mock = mockProcessExit()
    try {
      assert.throws(() => process.exit())
      assert.deepEqual(mock.getExitCodes(), [0])
    } finally {
      mock.restore()
    }
  })

  it("restore() restores original process.exit", () => {
    const originalExit = process.exit
    const mock = mockProcessExit()
    mock.restore()
    assert.equal(process.exit, originalExit)
  })
})

describe("createInMemoryFs", () => {
  it("writeFile and readFile round-trip", () => {
    const mockFs = createInMemoryFs()
    mockFs.writeFile("/home/test.txt", "hello world")
    assert.equal(mockFs.readFile("/home/test.txt"), "hello world")
  })

  it("exists returns correct state", () => {
    const mockFs = createInMemoryFs()
    assert.ok(!mockFs.exists("/nope.txt"))
    mockFs.writeFile("/yes.txt", "yep")
    assert.ok(mockFs.exists("/yes.txt"))
  })

  it("readdir returns top-level entries", () => {
    const mockFs = createInMemoryFs()
    mockFs.writeFile("/a/b/c.txt", "deep")
    mockFs.writeFile("/a/d.txt", "shallow")
    mockFs.writeFile("/root.txt", "root")

    const aFiles = mockFs.readdir("/a")
    assert.ok(aFiles.includes("b"))
    assert.ok(aFiles.includes("d.txt"))
    assert.equal(aFiles.length, 2)

    const rootFiles = mockFs.readdir("/")
    assert.ok(rootFiles.includes("a"))
    assert.ok(rootFiles.includes("root.txt"))
  })

  it("unlink removes a file", () => {
    const mockFs = createInMemoryFs()
    mockFs.writeFile("/temp.txt", "temp")
    assert.ok(mockFs.exists("/temp.txt"))
    assert.ok(mockFs.unlink("/temp.txt"))
    assert.ok(!mockFs.exists("/temp.txt"))
  })

  it("restore clears all entries", () => {
    const mockFs = createInMemoryFs()
    mockFs.writeFile("/a.txt", "a")
    mockFs.writeFile("/b.txt", "b")
    mockFs.restore()
    assert.equal(mockFs.entries().size, 0)
  })

  it("normalizes backslashes", () => {
    const mockFs = createInMemoryFs()
    mockFs.writeFile("foo\\bar.txt", "content")
    assert.ok(mockFs.exists("/foo/bar.txt"))
  })
})

describe("createMockEmitter", () => {
  it("on/emit delivers events", () => {
    interface Events { data: (msg: string) => void }
    const emitter = createMockEmitter<Events>()
    const received: string[] = []

    emitter.on("data", (msg) => { received.push(msg) })
    emitter.emit("data", "hello")
    emitter.emit("data", "world")

    assert.deepEqual(received, ["hello", "world"])
  })

  it("off removes handler", () => {
    interface Events { tick: () => void }
    const emitter = createMockEmitter<Events>()
    let count = 0

    const handler = () => { count++ }
    emitter.on("tick", handler)
    emitter.emit("tick")
    assert.equal(count, 1)

    emitter.off("tick", handler)
    emitter.emit("tick")
    assert.equal(count, 1) // Should not increase
  })

  it("listenerCount returns correct count", () => {
    interface Events { e: () => void }
    const emitter = createMockEmitter<Events>()

    assert.equal(emitter.listenerCount("e"), 0)

    const h1 = () => {}
    const h2 = () => {}
    emitter.on("e", h1)
    emitter.on("e", h2)
    assert.equal(emitter.listenerCount("e"), 2)
  })

  it("clearListeners removes all handlers", () => {
    interface Events { e: () => void }
    const emitter = createMockEmitter<Events>()
    emitter.on("e", () => {})
    emitter.on("e", () => {})
    emitter.clearListeners()
    assert.equal(emitter.listenerCount("e"), 0)
  })
})

describe("createMockAbortController", () => {
  it("starts not aborted", () => {
    const ctrl = createMockAbortController()
    assert.ok(!ctrl.aborted)
    assert.ok(!ctrl.signal.aborted)
  })

  it("abort() sets aborted and fires listeners", () => {
    const ctrl = createMockAbortController()
    let aborted = false
    ctrl.signal.addEventListener("abort", () => { aborted = true })

    ctrl.abort()

    assert.ok(ctrl.aborted)
    assert.ok(ctrl.signal.aborted)
    assert.ok(aborted)
  })

  it("reset() clears aborted state and listeners", () => {
    const ctrl = createMockAbortController()
    ctrl.abort()
    assert.ok(ctrl.aborted)

    ctrl.reset()
    assert.ok(!ctrl.aborted)
  })

  it("delay() resolves after specified time", async () => {
    const ctrl = createMockAbortController()
    const start = Date.now()
    await ctrl.delay(50)
    const elapsed = Date.now() - start
    assert.ok(elapsed >= 40, `elapsed: ${elapsed}`)
  })

  it("restore() resets state (alias for reset)", () => {
    const ctrl = createMockAbortController()
    ctrl.abort()
    ctrl.restore()
    assert.ok(!ctrl.aborted)
  })
})
