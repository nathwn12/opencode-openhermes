// PlanFileWatcher — singleton that monitors plan files for external changes
// using fs.watch with debounced callbacks.

import fs from "node:fs";
import path from "node:path";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEBOUNCE_MS = 500; // Debounce window for file-change events

// ---------------------------------------------------------------------------
// PlanFileWatcher
// ---------------------------------------------------------------------------

export class PlanFileWatcher {
  private static instance: PlanFileWatcher | null = null;

  /** Active fs.FSWatcher instances keyed by directory path. */
  private watchers = new Map<string, fs.FSWatcher>();

  /** Registered callbacks keyed by directory path. */
  private callbacks = new Map<string, (path: string) => void>();

  /** Pending debounce timers keyed by directory path. */
  private debounceTimers = new Map<string, ReturnType<typeof setTimeout>>();

  /** Whether change-notifications are paused. */
  private _paused = false;

  private constructor() {}

  /** Get the singleton instance. */
  static getInstance(): PlanFileWatcher {
    if (!PlanFileWatcher.instance) {
      PlanFileWatcher.instance = new PlanFileWatcher();
    }
    return PlanFileWatcher.instance;
  }

  /** Reset singleton — used in tests. */
  static resetInstance(): void {
    const inst = PlanFileWatcher.instance;
    if (inst) {
      inst.destroy();
      PlanFileWatcher.instance = null;
    }
  }

  // -----------------------------------------------------------------------
  // Public API
  // -----------------------------------------------------------------------

  /**
   * Start watching `directory` for plan-file changes.
   *
   * When a change is detected, `callback` is invoked with the path of the
   * changed file. Multiple events within DEBOUNCE_MS are coalesced.
   *
   * @param directory — absolute path to the directory containing plan files.
   * @param callback — fired once per debounced change event.
   */
  watch(directory: string, callback: (path: string) => void): void {
    // Unwatch first if already watching this directory (re-registration)
    if (this.watchers.has(directory)) {
      this.unwatch(directory);
    }

    this.callbacks.set(directory, callback);

    try {
      const watcher = fs.watch(
        directory,
        { recursive: false },
        (eventType: string, filename: string | null) => {
          // fs.watch may pass null filename on some platforms
          const targetPath = filename ? path.join(directory, filename) : directory;

          // Debounce — cancel any pending timer, schedule a new one.
          // The _paused check happens at fire time, not here, so events
          // received during pause are debounced and fire on resume.
          const existing = this.debounceTimers.get(directory);
          if (existing) clearTimeout(existing);

          this.debounceTimers.set(
            directory,
            setTimeout(() => {
              this.debounceTimers.delete(directory);
              const cb = this.callbacks.get(directory);
              if (cb && !this._paused) {
                cb(targetPath);
              }
            }, DEBOUNCE_MS),
          );
        },
      );

      this.watchers.set(directory, watcher);
    } catch (err) {
      // fs.watch can throw if directory doesn't exist or permissions issues
      console.error(`[PlanFileWatcher] Failed to watch "${directory}":`, err);
      this.watchers.delete(directory);
      this.callbacks.delete(directory);
    }
  }

  /**
   * Stop watching `directory`.
   */
  unwatch(directory: string): void {
    this.clearDebounce(directory);

    const watcher = this.watchers.get(directory);
    if (watcher) {
      watcher.close();
      this.watchers.delete(directory);
    }

    this.callbacks.delete(directory);
  }

  /**
   * Pause change-notification without losing watch-registrations.
   * While paused, events are still debounced but callbacks are suppressed.
   * Missed changes are not queued or replayed on resume.
   */
  pause(): void {
    this._paused = true;
  }

  /**
   * Resume change-notification after a pause.
   * Only future events will notify callbacks.
   */
  resume(): void {
    this._paused = false;
  }

  /** Check if the watcher is currently paused. */
  get paused(): boolean {
    return this._paused;
  }

  /** Return the list of currently watched directories. */
  watchedDirectories(): string[] {
    return Array.from(this.watchers.keys());
  }

  // -----------------------------------------------------------------------
  // Lifecycle
  // -----------------------------------------------------------------------

  /** Shut down all watchers and clear state. */
  destroy(): void {
    for (const [dir] of this.watchers) {
      this.unwatch(dir);
    }
    this.debounceTimers.clear();
    this.callbacks.clear();
    this._paused = false;
  }

  // -----------------------------------------------------------------------
  // Internals
  // -----------------------------------------------------------------------

  private clearDebounce(directory: string): void {
    const timer = this.debounceTimers.get(directory);
    if (timer) {
      clearTimeout(timer);
      this.debounceTimers.delete(directory);
    }
  }
}
