import { spawn, exec, type ChildProcess } from "node:child_process";
import { randomUUID } from "node:crypto";
import type {
  BackgroundTask,
  BackgroundTaskStatus,
  BackgroundRunOptions,
} from "./interfaces.ts";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CLEANUP_INTERVAL_MS = 60_000; // Check for stale tasks every 60s
const TASK_MAX_AGE_MS = 5 * 60 * 1000; // 5 minutes

// ---------------------------------------------------------------------------
// Internal entry
// ---------------------------------------------------------------------------

interface TaskEntry {
  task: BackgroundTask;
  process: ChildProcess | null;
  timeoutId?: ReturnType<typeof setTimeout>;
}

// ---------------------------------------------------------------------------
// Manager
// ---------------------------------------------------------------------------

export class BackgroundManager {
  private static instance: BackgroundManager;
  private tasks = new Map<string, TaskEntry>();
  private cleanupTimer: ReturnType<typeof setInterval> | null = null;

  private constructor() {
    this.startCleanup();
  }

  // -----------------------------------------------------------------------
  // Singleton
  // -----------------------------------------------------------------------

  static getInstance(): BackgroundManager {
    if (!BackgroundManager.instance) {
      BackgroundManager.instance = new BackgroundManager();
    }
    return BackgroundManager.instance;
  }

  /** Reset singleton — used in tests to get a clean slate. */
  static resetInstance(): void {
    const inst = BackgroundManager.instance;
    if (inst) {
      inst.destroy();
      BackgroundManager.instance = null as unknown as BackgroundManager;
    }
  }

  // -----------------------------------------------------------------------
  // Public API
  // -----------------------------------------------------------------------

  /**
   * Spawn a background process and return its task ID immediately.
   * The task status starts as "pending" and transitions to "running" on
   * the next event-loop tick when the process actually spawns.
   */
  run(options: BackgroundRunOptions): string {
    const id = randomUUID();
    const cwd = options.cwd ?? process.cwd();
    const args = options.args ?? [];
    const timeout = options.timeout ?? 30_000;

    const task: BackgroundTask = {
      id,
      command: options.command,
      args,
      cwd,
      status: "pending",
      output: "",
      errorOutput: "",
      exitCode: null,
      startTime: Date.now(),
      endTime: null,
      timeout,
      label: options.label,
    };

    const entry: TaskEntry = { task, process: null };
    this.tasks.set(id, entry);

    // Defer to next tick so callers can observe "pending" immediately
    setImmediate(() => {
      this.spawnTask(id, options, entry);
    });

    return id;
  }

  /** Return current state of a tracked task, or undefined if not found. */
  check(id: string): BackgroundTask | undefined {
    this.sweepStale();
    return this.tasks.get(id)?.task;
  }

  /** Return all tracked tasks (including completed ones). */
  list(): BackgroundTask[] {
    this.sweepStale();
    return Array.from(this.tasks.values()).map((e) => e.task);
  }

  /**
   * Kill a running / pending task.
   * Returns true if the task existed and was killable, false otherwise.
   */
  kill(id: string): boolean {
    const entry = this.tasks.get(id);
    if (!entry) return false;

    const { task } = entry;
    if (isTerminal(task.status)) return false;

    this.killProcess(entry);
    task.status = "cancelled";
    task.endTime = Date.now();
    this.clearTimeout(entry);
    return true;
  }

  // -----------------------------------------------------------------------
  // Lifecycle (test cleanup / singleton teardown)
  // -----------------------------------------------------------------------

  /** Shut down the manager — kill all processes, clear state, stop timers. */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    for (const [, entry] of this.tasks) {
      if (!isTerminal(entry.task.status)) {
        this.killProcess(entry);
      }
      this.clearTimeout(entry);
    }
    this.tasks.clear();
  }

  // -----------------------------------------------------------------------
  // Internals
  // -----------------------------------------------------------------------

  private spawnTask(
    id: string,
    options: BackgroundRunOptions,
    entry: TaskEntry,
  ): void {
    const { task } = entry;
    const args = options.args ?? [];
    const env = options.env;
    const timeout = options.timeout ?? 30_000;

    try {
      const isWindows = process.platform === "win32";

      // On Windows, wrap everything in cmd.exe /c so PATH and .exe
      // resolution work the way users expect.
      // Sanitize: strip shell metacharacters from the command to prevent
      // command injection via LLM-generated command strings.
      const command = isWindows ? "cmd.exe" : options.command;
      const sanitizedCommand = isWindows
        ? options.command.replace(/[&|;<>^%!]/g, "")
        : options.command;
      const commandArgs = isWindows
        ? ["/d", "/c", sanitizedCommand, ...args]
        : args;

      const child = spawn(command, commandArgs, {
        cwd: task.cwd,
        env: env ? { ...process.env, ...env } : undefined,
        stdio: ["ignore", "pipe", "pipe"],
      });

      entry.process = child;
      task.status = "running";

      child.stdout?.on("data", (data: Buffer) => {
        task.output += data.toString();
      });

      child.stderr?.on("data", (data: Buffer) => {
        task.errorOutput += data.toString();
      });

      child.on("error", (err: Error) => {
        task.status = "failed";
        task.errorOutput += `\n[spawn error] ${err.message}`;
        task.endTime = Date.now();
        this.clearTimeout(entry);
      });

      child.on("close", (code: number | null) => {
        task.exitCode = code;
        task.endTime = Date.now();
        if (task.status === "running" || task.status === "pending") {
          task.status = code === 0 ? "completed" : "failed";
        }
        this.clearTimeout(entry);
      });

      // Timeout enforcement
      if (timeout > 0) {
        entry.timeoutId = setTimeout(() => {
          if (!isTerminal(task.status)) {
            this.killProcess(entry);
            task.status = "timed_out";
            task.endTime = Date.now();
          }
        }, timeout);
      }
    } catch (err) {
      task.status = "failed";
      task.errorOutput = `[exception] ${String(err)}`;
      task.endTime = Date.now();
    }
  }

  private async killProcess(entry: TaskEntry): Promise<void> {
    if (!entry.process) return;

    if (process.platform === "win32") {
      // Forceful tree-kill via taskkill (more reliable than SIGTERM on Windows)
      try {
        await new Promise<void>((resolve, reject) => {
          exec(`taskkill /pid ${entry.process!.pid} /f /t`, (err) => {
            if (err) reject(err);
            else resolve();
          });
        });
      } catch {
        // taskkill failed — process may already be dead
      }
      // Also try SIGTERM as a graceful fallback
      try {
        entry.process.kill("SIGTERM");
      } catch {
        /* already dead */
      }
    } else {
      try {
        entry.process.kill("SIGTERM");
      } catch {
        /* already dead */
      }
    }
  }

  private clearTimeout(entry: TaskEntry): void {
    if (entry.timeoutId !== undefined) {
      clearTimeout(entry.timeoutId);
      entry.timeoutId = undefined;
    }
  }

  private startCleanup(): void {
    this.cleanupTimer = setInterval(() => this.sweepStale(), CLEANUP_INTERVAL_MS);
    this.cleanupTimer?.unref();
  }

  /**
   * Remove stale tasks:
   * - Completed/failed tasks older than TASK_MAX_AGE_MS
   * - Zombie processes (status "running" but process handle is dead)
   */
  private sweepStale(): void {
    const now = Date.now();
    for (const [id, entry] of this.tasks) {
      const { task } = entry;

      // Completed/failed tasks older than threshold
      if (task.endTime && now - task.endTime > TASK_MAX_AGE_MS) {
        this.clearTimeout(entry);
        this.tasks.delete(id);
        continue;
      }

      // Check for zombie processes: status "running" but process has exited
      // Use exitCode !== null as the reliable cross-platform check
      if (task.status === "running" && entry.process) {
        if (entry.process.exitCode !== null) {
          // Process exited but the close event wasn't processed (zombie)
          task.status = "failed";
          task.endTime = Date.now();
          this.tasks.delete(id);
        }
      } else if (task.status === "running" && !entry.process) {
        // Process reference is gone but status not updated
        task.status = "failed";
        task.endTime = Date.now();
        this.tasks.delete(id);
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isTerminal(status: BackgroundTaskStatus): boolean {
  return (
    status === "completed" ||
    status === "failed" ||
    status === "timed_out" ||
    status === "cancelled"
  );
}
