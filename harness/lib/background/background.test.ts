import { describe, it, afterEach } from "node:test";
import assert from "node:assert/strict";
import { BackgroundManager } from "./manager.ts";
import type { BackgroundTaskStatus } from "./interfaces.ts";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Poll check() until the task reaches one of the given statuses, or until
 * a generous timeout elapses (2.5 s).
 */
async function waitForStatus(
  manager: BackgroundManager,
  id: string,
  ...expected: BackgroundTaskStatus[]
): Promise<void> {
  for (let i = 0; i < 50; i++) {
    const task = manager.check(id);
    if (task && expected.includes(task.status)) return;
    await delay(50);
  }
  const task = manager.check(id);
  const actual = task?.status ?? "(not found)";
  throw new Error(
    `Timed out waiting for status [${expected.join("/")}], got "${actual}"`,
  );
}

// Windows detection — some assertions differ per platform
const IS_WIN = process.platform === "win32";

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("BackgroundManager", () => {
  afterEach(() => {
    BackgroundManager.resetInstance();
  });

  // ---- 1: run() returns ID immediately ----------------------------------

  it("run() returns a task ID immediately", () => {
    const mgr = BackgroundManager.getInstance();
    const id = mgr.run({ command: IS_WIN ? "echo" : "echo", args: ["hello"] });
    assert.ok(typeof id === "string");
    assert.ok(id.length > 0, "id must not be empty");
  });

  // ---- 2: check() shows pending → running → completed -------------------

  it("check() transitions pending -> running -> completed", async () => {
    const mgr = BackgroundManager.getInstance();
    const id = mgr.run({ command: IS_WIN ? "echo" : "echo", args: ["hello"] });

    // Immediately after run() the task should be "pending"
    // (spawn is deferred via setImmediate)
    const initial = mgr.check(id);
    assert.ok(initial, "task must exist immediately");
    assert.equal(initial!.status, "pending");

    // Wait for it to complete
    await waitForStatus(mgr, id, "completed");
    const done = mgr.check(id);
    assert.equal(done!.exitCode, 0);
  });

  it("resetInstance returns a fresh manager with cleared state", async () => {
    const mgr = BackgroundManager.getInstance();
    const id = mgr.run({
      command: IS_WIN ? "powershell.exe" : "sleep",
      args: IS_WIN
        ? ["-NoProfile", "-Command", "Start-Sleep -Seconds 30"]
        : ["30"],
      timeout: 0,
    });

    await waitForStatus(mgr, id, "running");

    BackgroundManager.resetInstance();

    const fresh = BackgroundManager.getInstance();
    assert.notEqual(fresh, mgr);
    assert.equal(fresh.list().length, 0);
  });

  // ---- 3: capture stdout -------------------------------------------------

  it("captures stdout from a simple command", async () => {
    const mgr = BackgroundManager.getInstance();
    const id = mgr.run({
      command: IS_WIN ? "echo" : "echo",
      args: ["hello-background"],
    });

    await waitForStatus(mgr, id, "completed");
    const task = mgr.check(id);
    assert.ok(task, "task must exist");
    assert.match(task!.output, /hello-background/);
  });

  // ---- 4: failed command (non-zero exit) ---------------------------------

  it("detects a failed command (non-zero exit)", async () => {
    const mgr = BackgroundManager.getInstance();
    const id = mgr.run({
      command: IS_WIN ? "cmd.exe" : "bash",
      args: IS_WIN ? ["/c", "exit", "1"] : ["-c", "exit 1"],
    });

    await waitForStatus(mgr, id, "failed");
    const task = mgr.check(id);
    assert.ok(task);
    assert.equal(task!.exitCode, 1);
    assert.equal(task!.status, "failed");
  });

  // ---- 5: timeout enforcement --------------------------------------------

  it("enforces timeout and marks task as timed_out", async () => {
    const mgr = BackgroundManager.getInstance();

    // Use a long-running command with a very short timeout (100 ms)
    const id = mgr.run({
      command: IS_WIN ? "powershell.exe" : "sleep",
      args: IS_WIN
        ? ["-NoProfile", "-Command", "Start-Sleep -Seconds 30"]
        : ["30"],
      timeout: 100,
    });

    await waitForStatus(mgr, id, "timed_out");
    const task = mgr.check(id);
    assert.ok(task);
    assert.equal(task!.status, "timed_out");
  });

  // ---- 6: kill() marks as cancelled --------------------------------------

  it("kill() marks a running task as cancelled", async () => {
    const mgr = BackgroundManager.getInstance();

    const id = mgr.run({
      command: IS_WIN ? "powershell.exe" : "sleep",
      args: IS_WIN
        ? ["-NoProfile", "-Command", "Start-Sleep -Seconds 30"]
        : ["30"],
      timeout: 0, // no timeout
    });

    // Wait for the task to enter "running"
    await waitForStatus(mgr, id, "running");

    // Kill it
    const killed = mgr.kill(id);
    assert.ok(killed, "kill() must return true");

    const task = mgr.check(id);
    assert.ok(task);
    assert.equal(task!.status, "cancelled");
  });

  // ---- 7: list() returns all tasks ---------------------------------------

  it("list() returns all tracked tasks", async () => {
    const mgr = BackgroundManager.getInstance();
    const id1 = mgr.run({ command: IS_WIN ? "echo" : "echo", args: ["a"] });
    const id2 = mgr.run({ command: IS_WIN ? "echo" : "echo", args: ["b"] });

    const tasks = mgr.list();
    const ids = tasks.map((t) => t.id);
    assert.ok(ids.includes(id1), "list must contain first task");
    assert.ok(ids.includes(id2), "list must contain second task");
  });

  // ---- 8: kill() on already-terminal task returns false ------------------

  it("kill() returns false for already-completed task", async () => {
    const mgr = BackgroundManager.getInstance();
    const id = mgr.run({ command: IS_WIN ? "echo" : "echo", args: ["quick"] });

    await waitForStatus(mgr, id, "completed");
    const result = mgr.kill(id);
    assert.equal(result, false, "kill() must return false on complete task");
  });

  // ---- 9: check() returns undefined for unknown ID -----------------------

  it("check() returns undefined for unknown task ID", () => {
    const mgr = BackgroundManager.getInstance();
    const result = mgr.check("nonexistent-id");
    assert.equal(result, undefined);
  });

  // ---- 10: error output captured on command-not-found --------------------

  it("captures error output when command does not exist", async () => {
    const mgr = BackgroundManager.getInstance();
    const id = mgr.run({ command: "this-command-does-not-exist-hopefully" });

    await waitForStatus(mgr, id, "failed");
    const task = mgr.check(id);
    assert.ok(task);
    // On Windows cmd.exe will emit an error; on Unix spawn error will fire
    assert.ok(
      task!.errorOutput.length > 0 || task!.output.length > 0,
      "should have some error output",
    );
  });
});
