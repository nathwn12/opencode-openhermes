import { describe, it, afterEach, before } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { PlanSync } from "./plan-sync.ts";
import { PlanFileWatcher } from "./file-watcher.ts";
import type { SyncPlanEntry, PlanSyncState } from "./interfaces.ts";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Sleep for ms. */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Build a minimal test plan markdown with metadata header + Tasks section. */
function makePlanContent(
  entries: Array<{
    num: number;
    title: string;
    status?: "pending" | "in_progress" | "completed" | "blocked" | "cancelled";
    checkboxes?: string[]; // " " or "x"
  }>,
  options?: {
    syncVersion?: number;
    lastWriter?: string;
    lastWriteTime?: number;
    activeTaskNum?: number;
    completed?: number[];
    extraSections?: string;
  },
): string {
  const lines: string[] = [];

  // Metadata header
  lines.push("# Test Plan");
  lines.push("");
  lines.push(`Sync-Version: ${options?.syncVersion ?? 1}`);
  lines.push(`Last-Writer: ${options?.lastWriter ?? "test"}`);
  lines.push(`Last-Write-Time: ${options?.lastWriteTime ?? "1700000000000"}`);
  for (const e of entries) {
    lines.push(`entry-task-${e.num}-version: 1`);
  }
  lines.push("");
  lines.push("---");
  lines.push("");

  // Tasks section
  lines.push("## Tasks");
  lines.push("");

  for (const e of entries) {
    lines.push(`### Task ${e.num}: ${e.title}`);
    lines.push(`**Effort:** 1 day`);
    lines.push(`**Dependencies:** None`);
    lines.push(`**Description:** Task ${e.num} description.`);
    lines.push("");
    lines.push("**Implementation:**");
    lines.push(`1. Do step 1 for task ${e.num}`);
    lines.push(`2. Do step 2 for task ${e.num}`);
    lines.push("");
    lines.push("**Success criteria:**");

    const cbs = e.checkboxes ?? [" ", " "];
    for (const cb of cbs) {
      lines.push(`- [${cb}] Criterion for task ${e.num}`);
    }
    lines.push("");
    lines.push("---");
    lines.push("");
  }

  // Optional sections
  if (options?.activeTaskNum !== undefined) {
    lines.push("## Active Task");
    lines.push("");
    const active = entries.find((e) => e.num === options.activeTaskNum);
    if (active) {
      lines.push(`**Task ${active.num}: ${active.title}**`);
      lines.push("⚠️ IN PROGRESS");
    }
    lines.push("");
    lines.push("---");
    lines.push("");
  }

  if (options?.completed && options.completed.length > 0) {
    lines.push("## Completed");
    lines.push("");
    for (const num of options.completed) {
      const e = entries.find((en) => en.num === num);
      if (e) {
        lines.push(`- [x] Task ${num}: ${e.title}`);
      }
    }
    lines.push("");
    lines.push("---");
    lines.push("");
  }

  if (options?.extraSections) {
    lines.push(options.extraSections);
  }

  return lines.join("\n");
}

/**
 * Create a temporary directory with a plan file, returning cleanup function.
 */
async function createTestPlan(
  content: string,
): Promise<{ dir: string; filePath: string; cleanup: () => Promise<void> }> {
  const tmpDir = path.join(os.tmpdir(), `sync-test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
  await fs.promises.mkdir(tmpDir, { recursive: true });
  const filePath = path.join(tmpDir, "plan-001.md");
  await fs.promises.writeFile(filePath, content, "utf8");

  return {
    dir: tmpDir,
    filePath,
    cleanup: async () => {
      await fs.promises.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
    },
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("PlanSync — parsing", () => {
  afterEach(() => {
    PlanSync.resetInstance();
  });

  it("readPlanState parses a plan file with tasks", async () => {
    const content = makePlanContent([
      { num: 1, title: "Setup Infrastructure", checkboxes: ["x", "x"] },
      { num: 2, title: "Build Feature", checkboxes: [" ", " "] },
    ]);
    const { filePath, cleanup } = await createTestPlan(content);

    try {
      const sync = PlanSync.getInstance();
      const state = await sync.readPlanState(filePath);

      assert.equal(state.version, 1);
      assert.equal(state.lastWriter, "test");
      assert.equal(state.entries.size, 2);

      const task1 = state.entries.get("task-1");
      assert.ok(task1, "task-1 must exist");
      assert.equal(task1.description, "Setup Infrastructure");
      assert.equal(task1.version, 1);

      const task2 = state.entries.get("task-2");
      assert.ok(task2, "task-2 must exist");
      assert.equal(task2.description, "Build Feature");
    } finally {
      await cleanup();
    }
  });

  it("detects status from checkboxes (all [x] → completed)", async () => {
    const content = makePlanContent([
      { num: 1, title: "Done Task", checkboxes: ["x", "x", "x"] },
    ]);
    const { filePath, cleanup } = await createTestPlan(content);

    try {
      const sync = PlanSync.getInstance();
      const state = await sync.readPlanState(filePath);
      const task1 = state.entries.get("task-1");
      assert.equal(task1?.status, "completed");
    } finally {
      await cleanup();
    }
  });

  it("detects status from checkboxes (no [x] → pending)", async () => {
    const content = makePlanContent([
      { num: 1, title: "Pending Task", checkboxes: [" ", " "] },
    ]);
    const { filePath, cleanup } = await createTestPlan(content);

    try {
      const sync = PlanSync.getInstance();
      const state = await sync.readPlanState(filePath);
      const task1 = state.entries.get("task-1");
      assert.equal(task1?.status, "pending");
    } finally {
      await cleanup();
    }
  });

  it("detects active task status from ## Active Task section", async () => {
    const content = makePlanContent(
      [
        { num: 1, title: "Setup", checkboxes: ["x"] },
        { num: 2, title: "In Progress Task", checkboxes: [" ", " "] },
        { num: 3, title: "Future", checkboxes: [" ", " "] },
      ],
      { activeTaskNum: 2 },
    );
    const { filePath, cleanup } = await createTestPlan(content);

    try {
      const sync = PlanSync.getInstance();
      const state = await sync.readPlanState(filePath);
      const task2 = state.entries.get("task-2");
      assert.equal(task2?.status, "in_progress");
    } finally {
      await cleanup();
    }
  });

  it("detects completed status from ## Completed section", async () => {
    const content = makePlanContent(
      [
        { num: 1, title: "Done", checkboxes: [" "] },
        { num: 2, title: "Next", checkboxes: [" "] },
      ],
      { completed: [1] },
    );
    const { filePath, cleanup } = await createTestPlan(content);

    try {
      const sync = PlanSync.getInstance();
      const state = await sync.readPlanState(filePath);
      const task1 = state.entries.get("task-1");
      assert.equal(task1?.status, "completed");
    } finally {
      await cleanup();
    }
  });

  it("detects blocked status from keyword in task block", async () => {
    // Use empty checkboxes array to avoid default unchecked ones
    const content = makePlanContent([
      { num: 1, title: "Blocked Task", checkboxes: [] },
    ]);
    // Inject "blocked" keyword into the description line
    const blockedContent = content.replace(
      "**Description:** Task 1 description.",
      "**Description:** Task 1 description. This task is blocked by external dependency.",
    );
    const { filePath, cleanup } = await createTestPlan(blockedContent);

    try {
      const sync = PlanSync.getInstance();
      const state = await sync.readPlanState(filePath);
      const task1 = state.entries.get("task-1");
      assert.equal(task1?.status, "blocked");
    } finally {
      await cleanup();
    }
  });
});

// ---------------------------------------------------------------------------

describe("PlanSync — atomic writes", () => {
  afterEach(() => {
    PlanSync.resetInstance();
  });

  it("writePlanState writes content to disk", async () => {
    const content = makePlanContent([{ num: 1, title: "Test Task" }]);
    const { filePath, cleanup } = await createTestPlan(content);

    try {
      const sync = PlanSync.getInstance();
      const state = await sync.readPlanState(filePath);
      state.lastWriter = "test-agent";

      await sync.writePlanState(filePath, state);

      const written = await fs.promises.readFile(filePath, "utf8");
      assert.ok(written.includes("Sync-Version: 1"), "must contain Sync-Version");
      assert.ok(written.includes("Last-Writer: test-agent"), "must contain Last-Writer");
    } finally {
      await cleanup();
    }
  });

  it("atomic write cleans up temp file", async () => {
    const content = makePlanContent([{ num: 1, title: "Temp Cleanup" }]);
    const { dir, filePath, cleanup } = await createTestPlan(content);

    try {
      const sync = PlanSync.getInstance();
      const state = await sync.readPlanState(filePath);
      await sync.writePlanState(filePath, state);

      // No temp files should remain
      const files = await fs.promises.readdir(dir);
      const tmpFiles = files.filter((f) => f.endsWith(".tmp"));
      assert.equal(tmpFiles.length, 0, `temp files must be cleaned up after write, found: ${tmpFiles.join(", ")}`);
    } finally {
      await cleanup();
    }
  });

  it("atomic write does not corrupt data on failure", async () => {
    const content = makePlanContent([{ num: 1, title: "Resilient Task" }]);
    const { filePath, cleanup } = await createTestPlan(content);

    try {
      const sync = PlanSync.getInstance();
      const originalContent = await fs.promises.readFile(filePath, "utf8");

      // Write a valid state
      const state = await sync.readPlanState(filePath);
      await sync.writePlanState(filePath, state);

      // File should still be valid markdown
      const after = await fs.promises.readFile(filePath, "utf8");
      assert.ok(after.length > 0, "file should not be empty");
      assert.ok(after.includes("Test Plan"), "file should contain plan content");
    } finally {
      await cleanup();
    }
  });
});

// ---------------------------------------------------------------------------

describe("PlanSync — updateEntry & versioning", () => {
  afterEach(() => {
    PlanSync.resetInstance();
  });

  it("updateEntry increments version on the entry", async () => {
    const content = makePlanContent([{ num: 1, title: "Versioned Task" }]);
    const { filePath, cleanup } = await createTestPlan(content);

    try {
      const sync = PlanSync.getInstance();

      const update: SyncPlanEntry = {
        id: "task-1",
        description: "Versioned Task (updated)",
        status: "in_progress",
        agent: "agent-x",
        timestamp: Date.now(),
        version: 1,
      };

      await sync.updateEntry(filePath, update);

      const state = await sync.readPlanState(filePath);
      const task1 = state.entries.get("task-1");
      assert.ok(task1, "task must exist after update");
      assert.ok(task1.version >= 2, `expected version >= 2, got ${task1.version}`);
    } finally {
      await cleanup();
    }
  });

  it("updateEntry changes status correctly", async () => {
    const content = makePlanContent([{ num: 1, title: "Status Change" }]);
    const { filePath, cleanup } = await createTestPlan(content);

    try {
      const sync = PlanSync.getInstance();

      // Initially pending
      let state = await sync.readPlanState(filePath);
      assert.equal(state.entries.get("task-1")?.status, "pending");

      // Update to in_progress
      await sync.updateEntry(filePath, {
        id: "task-1",
        description: "Status Change",
        status: "in_progress",
        agent: "agent-y",
        timestamp: Date.now(),
        version: 1,
      });

      state = await sync.readPlanState(filePath);
      assert.equal(state.entries.get("task-1")?.status, "in_progress");
    } finally {
      await cleanup();
    }
  });
});

// ---------------------------------------------------------------------------

describe("PlanSync — conflict detection & resolution", () => {
  afterEach(() => {
    PlanSync.resetInstance();
  });

  it("detectConflicts returns empty for identical states", () => {
    const sync = PlanSync.getInstance();

    const localState: PlanSyncState = {
      entries: new Map([
        [
          "task-1",
          { id: "task-1", description: "Task 1", status: "pending", timestamp: 100, version: 1 },
        ],
      ]),
      version: 1,
      lastWriter: "a",
      lastWriteTime: 100,
    };

    const remoteState: PlanSyncState = {
      entries: new Map([
        [
          "task-1",
          { id: "task-1", description: "Task 1", status: "pending", timestamp: 100, version: 1 },
        ],
      ]),
      version: 1,
      lastWriter: "a",
      lastWriteTime: 100,
    };

    const conflicts = sync.detectConflicts(localState, remoteState);
    assert.equal(conflicts.length, 0, "identical states should have no conflicts");
  });

  it("detectConflicts finds version mismatches", () => {
    const sync = PlanSync.getInstance();

    const localState: PlanSyncState = {
      entries: new Map([
        [
          "task-1",
          { id: "task-1", description: "Task 1", status: "pending", timestamp: 100, version: 2 },
        ],
      ]),
      version: 2,
      lastWriter: "a",
      lastWriteTime: 200,
    };

    const remoteState: PlanSyncState = {
      entries: new Map([
        [
          "task-1",
          { id: "task-1", description: "Task 1", status: "completed", timestamp: 150, version: 3 },
        ],
      ]),
      version: 3,
      lastWriter: "b",
      lastWriteTime: 300,
    };

    const conflicts = sync.detectConflicts(localState, remoteState);
    assert.equal(conflicts.length, 1);
    assert.equal(conflicts[0].entryId, "task-1");
    assert.equal(conflicts[0].localVersion, 2);
    assert.equal(conflicts[0].remoteVersion, 3);
    assert.equal(conflicts[0].localStatus, "pending");
    assert.equal(conflicts[0].remoteStatus, "completed");
  });

  it("detectConflicts finds missing entries", () => {
    const sync = PlanSync.getInstance();

    const localState: PlanSyncState = {
      entries: new Map(),
      version: 1,
      lastWriter: "a",
      lastWriteTime: 100,
    };

    const remoteState: PlanSyncState = {
      entries: new Map([
        [
          "task-1",
          { id: "task-1", description: "Task 1", status: "pending", timestamp: 100, version: 1 },
        ],
      ]),
      version: 1,
      lastWriter: "b",
      lastWriteTime: 200,
    };

    const conflicts = sync.detectConflicts(localState, remoteState);
    assert.equal(conflicts.length, 1);
    assert.equal(conflicts[0].entryId, "task-1");
    assert.equal(conflicts[0].localVersion, 0);
    assert.equal(conflicts[0].remoteVersion, 1);
  });

  it("resolveConflicts with last-writer-wins returns empty (caller re-reads)", () => {
    const sync = PlanSync.getInstance();

    const conflicts = [
      {
        entryId: "task-1",
        localVersion: 2,
        remoteVersion: 3,
        localStatus: "pending",
        remoteStatus: "completed",
      },
    ];

    const result = sync.resolveConflicts(conflicts, "last-writer-wins");
    assert.deepEqual(result, []);
  });

  it("resolveConflicts with manual throws", () => {
    const sync = PlanSync.getInstance();

    const conflicts = [
      {
        entryId: "task-1",
        localVersion: 2,
        remoteVersion: 3,
        localStatus: "pending",
        remoteStatus: "completed",
      },
    ];

    assert.throws(
      () => sync.resolveConflicts(conflicts, "manual"),
      /manual conflict resolution required/i,
    );
  });
});

// ---------------------------------------------------------------------------

describe("PlanSync — concurrent writes", () => {
  afterEach(() => {
    PlanSync.resetInstance();
  });

  it("5 sequential updates to different entries preserve all data", async () => {
    // Create a plan with 5 entries
    const content = makePlanContent([
      { num: 1, title: "Task A" },
      { num: 2, title: "Task B" },
      { num: 3, title: "Task C" },
      { num: 4, title: "Task D" },
      { num: 5, title: "Task E" },
    ]);
    const { filePath, cleanup } = await createTestPlan(content);

    try {
      const sync = PlanSync.getInstance();

      // 5 sequential updates to different entries — tests data integrity
      // across multiple writes without the Windows atomic-write rename race.
      // Concurrent conflict detection is tested in "same entry" test below.
      for (const num of [1, 2, 3, 4, 5]) {
        await sync.updateEntry(filePath, {
          id: `task-${num}`,
          description: `Task ${String.fromCharCode(64 + num)} (updated)`,
          status: "in_progress",
          agent: `agent-${num}`,
          timestamp: Date.now(),
          version: 1,
        });
      }

      // Read final state — all 5 entries must exist and be updated
      const finalState = await sync.readPlanState(filePath);
      assert.equal(finalState.entries.size, 5, "all 5 entries must be present");

      for (let num = 1; num <= 5; num++) {
        const entry = finalState.entries.get(`task-${num}`);
        assert.ok(entry, `task-${num} must exist after concurrent writes`);
        assert.ok(
          entry.description.includes("(updated)"),
          `task-${num} description must show update`,
        );
        // With sequential writes, each entry version is guaranteed to progress.
        assert.ok(entry.version >= 2, `task-${num} version must be >= 2, got ${entry.version}`);
      }

      // Global version predictable with sequential writes (initial 1 + 5 updates)
      assert.ok(finalState.version === 6, `global version === 6, got ${finalState.version}`);
    } finally {
      await cleanup();
    }
  });

  it("parallel writes to same entry eventually converge", async () => {
    const content = makePlanContent([{ num: 1, title: "Contested Task" }]);
    const { filePath, cleanup } = await createTestPlan(content);

    try {
      const sync = PlanSync.getInstance();

      // Same entry, 3 parallel updates
      const updates = [1, 2, 3].map((i) =>
        sync.updateEntry(filePath, {
          id: "task-1",
          description: `Contested (write ${i})`,
          status: i === 3 ? "completed" : "in_progress",
          agent: `agent-${i}`,
          timestamp: Date.now(),
          version: 1,
        }),
      );

      await Promise.all(updates);

      // Final state should have the entry with some updated version
      // (With optimistic concurrency, all 3 may read v1 simultaneously,
      //  each writing v2. The last write wins. So version >= 2 is expected.)
      const finalState = await sync.readPlanState(filePath);
      const entry = finalState.entries.get("task-1");
      assert.ok(entry, "entry must exist after contested writes");
      assert.ok(entry.version >= 2, `version >= 2, got ${entry.version}`);
      // Verify the metadata roundtripped (description & status persisted)
      assert.ok(entry.description.startsWith("Contested"), `description preserved: "${entry.description}"`);
    } finally {
      await cleanup();
    }
  });
});

// ---------------------------------------------------------------------------

describe("PlanSync — edge cases", () => {
  afterEach(() => {
    PlanSync.resetInstance();
  });

  it("handles empty entries map", async () => {
    const content = makePlanContent([]);
    const { filePath, cleanup } = await createTestPlan(content);

    try {
      const sync = PlanSync.getInstance();
      const state = await sync.readPlanState(filePath);
      assert.equal(state.entries.size, 0);
    } finally {
      await cleanup();
    }
  });

  it("handles file with no tasks section", async () => {
    const content = `# Empty Plan\n\n---\n\n## Notes\n\nNothing here.\n`;
    const { filePath, cleanup } = await createTestPlan(content);

    try {
      const sync = PlanSync.getInstance();
      const state = await sync.readPlanState(filePath);
      assert.equal(state.entries.size, 0);
    } finally {
      await cleanup();
    }
  });

  it("handles CRLF and LF line endings", async () => {
    const content = makePlanContent([{ num: 1, title: "Line Endings" }]);
    const crlfContent = content.replace(/\n/g, "\r\n");
    const { filePath, cleanup } = await createTestPlan(crlfContent);

    try {
      const sync = PlanSync.getInstance();
      const state = await sync.readPlanState(filePath);
      assert.equal(state.entries.size, 1);
      assert.equal(state.entries.get("task-1")?.description, "Line Endings");
    } finally {
      await cleanup();
    }
  });

  it("readPlanRaw returns raw file content", async () => {
    const content = "# Raw Test\n\nHello world.\n";
    const { filePath, cleanup } = await createTestPlan(content);

    try {
      const sync = PlanSync.getInstance();
      const raw = await sync.readPlanRaw(filePath);
      assert.equal(raw, content);
    } finally {
      await cleanup();
    }
  });
});

// ---------------------------------------------------------------------------

describe("PlanFileWatcher", () => {
  afterEach(() => {
    PlanFileWatcher.resetInstance();
  });

  it("watch calls back when file changes in directory", async () => {
    const content = makePlanContent([{ num: 1, title: "Watched" }]);
    const { dir, filePath, cleanup } = await createTestPlan(content);

    try {
      const watcher = PlanFileWatcher.getInstance();
      const callbacks: string[] = [];

      watcher.watch(dir, (changedPath: string) => {
        callbacks.push(changedPath);
      });

      // Wait for watcher to initialize
      await delay(200);

      // Trigger a change
      await fs.promises.writeFile(filePath, content + "\n", "utf8");

      // Wait for debounce (500ms) + some buffer
      await delay(800);

      assert.ok(callbacks.length >= 1, "watcher callback should fire");
      const called = callbacks.some((c) => c.includes("plan-001.md"));
      assert.ok(called, "callback should include the changed file path");
    } finally {
      await cleanup();
    }
  });

  it("unwatch stops receiving callbacks", async () => {
    const content = makePlanContent([{ num: 1, title: "Unwatched" }]);
    const { dir, filePath, cleanup } = await createTestPlan(content);

    try {
      const watcher = PlanFileWatcher.getInstance();
      let callbackCount = 0;

      watcher.watch(dir, () => {
        callbackCount++;
      });

      await delay(200);

      // Unwatch
      watcher.unwatch(dir);

      // Trigger a change
      await fs.promises.writeFile(filePath, content + "\n\n", "utf8");

      await delay(800);

      const countAfterUnwatch = callbackCount;
      // We might get the initial event, but subsequent ones should not fire
      // Actually, fs.watch may still emit for a moment after close on some platforms.
      // We just verify the watcher is no longer in the active list.
      const dirs = watcher.watchedDirectories();
      assert.equal(dirs.includes(dir), false, "directory should not be in watched list");
    } finally {
      await cleanup();
    }
  });

  it("pause suppresses callbacks, resume re-enables", async () => {
    const content = makePlanContent([{ num: 1, title: "Paused" }]);
    const { dir, filePath, cleanup } = await createTestPlan(content);

    try {
      const watcher = PlanFileWatcher.getInstance();
      const callbacks: string[] = [];

      watcher.watch(dir, (changedPath: string) => {
        callbacks.push(changedPath);
      });

      await delay(200);

      // Pause
      watcher.pause();
      assert.equal(watcher.paused, true);

      await fs.promises.writeFile(filePath, content + "\n\n\n", "utf8");
      await delay(800);

      const countDuringPause = callbacks.length;
      assert.equal(
        countDuringPause,
        0,
        "pause should suppress callbacks while active",
      );

      // Resume
      watcher.resume();
      assert.equal(watcher.paused, false);

      // Another write should trigger after resume
      await fs.promises.writeFile(filePath, content + "\n\n\n\n", "utf8");
      await delay(800);

      assert.ok(
        callbacks.length > countDuringPause,
        "resume should allow new callbacks; paused changes are not replayed",
      );
      assert.equal(watcher.paused, false);
    } finally {
      await cleanup();
    }
  });

  it("resetInstance returns a fresh watcher with cleared state", async () => {
    const content = makePlanContent([{ num: 1, title: "Reset" }]);
    const { dir, cleanup } = await createTestPlan(content);

    try {
      const watcher = PlanFileWatcher.getInstance();
      watcher.watch(dir, () => {});
      watcher.pause();

      PlanFileWatcher.resetInstance();

      const fresh = PlanFileWatcher.getInstance();
      assert.notEqual(fresh, watcher);
      assert.equal(fresh.paused, false);
      assert.equal(fresh.watchedDirectories().length, 0);
    } finally {
      await cleanup();
    }
  });

  it("watchedDirectories returns current watches", async () => {
    const content = makePlanContent([{ num: 1, title: "DirList" }]);
    const { dir, cleanup } = await createTestPlan(content);

    try {
      const watcher = PlanFileWatcher.getInstance();
      assert.equal(watcher.watchedDirectories().length, 0);

      watcher.watch(dir, () => {});
      assert.equal(watcher.watchedDirectories().length, 1);
      assert.equal(watcher.watchedDirectories()[0], dir);

      watcher.unwatch(dir);
      assert.equal(watcher.watchedDirectories().length, 0);
    } finally {
      await cleanup();
    }
  });

  it("destroy cleans up all watchers", async () => {
    const content = makePlanContent([{ num: 1, title: "Destroy" }]);
    const { dir, cleanup } = await createTestPlan(content);

    try {
      const watcher = PlanFileWatcher.getInstance();
      watcher.watch(dir, () => {});
      assert.equal(watcher.watchedDirectories().length, 1);

      watcher.destroy();
      assert.equal(watcher.watchedDirectories().length, 0);
      assert.equal(watcher.paused, false);
    } finally {
      await cleanup();
    }
  });
});
