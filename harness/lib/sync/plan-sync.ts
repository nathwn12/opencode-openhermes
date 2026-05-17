// PlanSync — singleton for MVCC-style concurrent-safe plan file access.
// Uses file-based version counters, atomic writes, and optimistic retry.

import fs from "node:fs";
import path from "node:path";
import type { SyncPlanEntry, PlanSyncState, SyncConflict, ConflictStrategy } from "./interfaces.ts";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MAX_RETRIES = 30;
const BASE_RETRY_DELAY_MS = 25;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Sleep for ms — used between optimistic retry attempts. */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Normalize line endings to \n so all regexes work consistently.
 * `\r\n` → `\n`, stray `\r` → `\n`.
 */
function normalizeEol(text: string): string {
  return text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

// ---------------------------------------------------------------------------
// PlanSync
// ---------------------------------------------------------------------------

export class PlanSync {
  private static instance: PlanSync;

  private constructor() {}

  /** Get the singleton instance. */
  static getInstance(): PlanSync {
    if (!PlanSync.instance) {
      PlanSync.instance = new PlanSync();
    }
    return PlanSync.instance;
  }

  /** Reset singleton — used in tests to get a clean slate. */
  static resetInstance(): void {
    PlanSync.instance = null as unknown as PlanSync;
  }

  // -----------------------------------------------------------------------
  // Public API
  // -----------------------------------------------------------------------

  /**
   * Read a plan markdown file and parse it into structured sync state.
   *
   * @param planFilePath — path to the plan `.md` file.
   */
  async readPlanState(planFilePath: string): Promise<PlanSyncState> {
    let content: string;
    try {
      content = await fs.promises.readFile(planFilePath, "utf8");
    } catch {
      return {
        entries: new Map(),
        version: 0,
        lastWriter: "system",
        lastWriteTime: Date.now(),
      };
    }
    return this.parsePlanContent(content);
  }

  /**
   * Atomically write the full sync state back to the plan file.
   * Uses temp file + rename to prevent partial writes.
   */
  async writePlanState(planFilePath: string, state: PlanSyncState): Promise<void> {
    const existing = await this.readPlanRaw(planFilePath).catch(() => "");
    const content = this.serializePlanContent(existing, state);
    await this.atomicWrite(planFilePath, content);
  }

  /**
   * Update a single entry using optimistic concurrency:
   * 1. Read current on-disk state
   * 2. Increment version counters
   * 3. Atomic write
   * 4. Re-read and verify no conflict; retry if needed
   */
  async updateEntry(planFilePath: string, entry: SyncPlanEntry): Promise<void> {
    // Add a small random initial delay to spread out concurrent callers
    await sleep(Math.random() * 10);

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      const currentState = await this.readPlanState(planFilePath);
      const existing = currentState.entries.get(entry.id);
      // Merge incoming fields with existing, bump version
      const merged: SyncPlanEntry = {
        ...existing,
        ...entry,
        version: (existing?.version ?? 0) + 1,
        timestamp: Date.now(),
      };

      currentState.entries.set(entry.id, merged);
      currentState.version = (currentState.version ?? 0) + 1;
      currentState.lastWriter = entry.agent ?? "unknown";
      currentState.lastWriteTime = Date.now();

      await this.writePlanState(planFilePath, currentState);

      // Snapshot all entry versions from the state we just wrote
      const writtenVersions = new Map<string, number>();
      for (const [id, e] of currentState.entries) {
        writtenVersions.set(id, e.version);
      }

      // Verify — re-read and check NO entry regressed below what we wrote
      const verifyState = await this.readPlanState(planFilePath);
      let allConsistent = true;
      for (const [id, writtenVersion] of writtenVersions) {
        const ve = verifyState.entries.get(id);
        if (!ve || ve.version < writtenVersion) {
          allConsistent = false;
          break;
        }
      }

      if (allConsistent) return;

      // Version mismatch — retry with fresh state
      // Add jitter so concurrent writers don't stay synchronized
      const jitter = Math.random() * BASE_RETRY_DELAY_MS;
      await sleep(BASE_RETRY_DELAY_MS + jitter);
    }

    throw new Error(
      `[PlanSync] Exceeded ${MAX_RETRIES} retries updating entry "${entry.id}" in "${planFilePath}"`,
    );
  }

  /**
   * Compare a local (in-memory) state against a remote (on-disk) state and
   * return any version mismatches.
   */
  detectConflicts(localState: PlanSyncState, remoteState: PlanSyncState): SyncConflict[] {
    const conflicts: SyncConflict[] = [];
    const allIds = new Set([
      ...localState.entries.keys(),
      ...remoteState.entries.keys(),
    ]);

    for (const entryId of allIds) {
      const local = localState.entries.get(entryId);
      const remote = remoteState.entries.get(entryId);

      if (!remote) continue; // local-only — no conflict
      if (!local) {
        // remote has it, local doesn't
        conflicts.push({
          entryId,
          localVersion: 0,
          remoteVersion: remote.version,
          localStatus: "(missing)",
          remoteStatus: remote.status,
        });
        continue;
      }

      if (local.version !== remote.version) {
        conflicts.push({
          entryId,
          localVersion: local.version,
          remoteVersion: remote.version,
          localStatus: local.status,
          remoteStatus: remote.status,
        });
      }
    }

    return conflicts;
  }

  /**
   * Resolve a list of conflicts using the given strategy.
   *
   * - `last-writer-wins`: returns empty array — caller should re-read from disk
   * - `manual`: throws with full conflict details
   */
  resolveConflicts(
    conflicts: SyncConflict[],
    strategy: ConflictStrategy = "last-writer-wins",
  ): SyncPlanEntry[] {
    if (strategy === "manual") {
      const details = conflicts
        .map(
          (c) =>
            `  - "${c.entryId}": local v${c.localVersion} (${c.localStatus}) vs remote v${c.remoteVersion} (${c.remoteStatus})`,
        )
        .join("\n");
      throw new Error(
        `[PlanSync] Manual conflict resolution required — ${conflicts.length} conflict(s):\n${details}`,
      );
    }

    // last-writer-wins: return empty — caller should re-read from disk
    return [];
  }

  /**
   * Raw read of plan file text — used by the markdown parser.
   */
  async readPlanRaw(filePath: string): Promise<string> {
    return fs.promises.readFile(filePath, "utf8");
  }

  // -----------------------------------------------------------------------
  // Internals — parsing
  // -----------------------------------------------------------------------

  /**
   * Parse raw markdown content into a PlanSyncState.
   *
   * Strategy:
   * 1. Read metadata (before first `##` heading) for version counters + entry versions.
   * 2. Find `## Tasks` section and extract tasks from `### Task N: Title` headings.
   * 3. For each task, determine status from checkboxes / active-task / completed sections.
   */
  private parsePlanContent(content: string): PlanSyncState {
    const normalized = normalizeEol(content);
    const entries = new Map<string, SyncPlanEntry>();
    const state: PlanSyncState = {
      entries,
      version: 1,
      lastWriter: "unknown",
      lastWriteTime: Date.now(),
    };

    // ---- 1. Extract metadata (everything above the first ## heading) ----
    const metaEnd = normalized.search(/\n## /);
    const metaBlock = metaEnd >= 0 ? normalized.slice(0, metaEnd) : normalized;
    const metaLines = metaBlock.split("\n");

    for (const line of metaLines) {
      const kv = line.match(/^(Sync-Version|Last-Writer|Last-Write-Time):\s*(.+)$/);
      if (!kv) continue;

      switch (kv[1]) {
        case "Sync-Version":
          state.version = parseInt(kv[2], 10) || 1;
          break;
        case "Last-Writer":
          state.lastWriter = kv[2].trim();
          break;
        case "Last-Write-Time":
          state.lastWriteTime = parseInt(kv[2], 10) || Date.now();
          break;
      }
    }

    // Parse per-entry metadata (version, description, status)
    const entryMeta = new Map<string, Record<string, string>>();
    for (const line of metaLines) {
      const ev = line.match(/^entry-(task-\d+)-version:\s*(\d+)$/i);
      if (ev) {
        const m = entryMeta.get(ev[1]) ?? {};
        m.version = ev[2];
        entryMeta.set(ev[1], m);
      }
      const ed = line.match(/^entry-(task-\d+)-description:\s*(.+)$/i);
      if (ed) {
        const m = entryMeta.get(ed[1]) ?? {};
        m.description = ed[2].trim();
        entryMeta.set(ed[1], m);
      }
      const es = line.match(/^entry-(task-\d+)-status:\s*(.+)$/i);
      if (es) {
        const m = entryMeta.get(es[1]) ?? {};
        m.status = es[2].trim().toLowerCase();
        entryMeta.set(es[1], m);
      }
    }

    // ---- 2. Find relevant sections ----
    const sections = this.splitIntoSections(normalized);
    const tasksContent = sections.get("## Tasks") ?? null;
    const completedContent = sections.get("## Completed") ?? null;
    const activeContent = sections.get("## Active Task") ?? null;

    // ---- 3. Parse tasks from ## Tasks section ----
    if (tasksContent) {
      const taskBlocks = this.splitTaskBlocks(tasksContent);

      for (const block of taskBlocks) {
        const hd = block.match(/^###\s+Task\s+(\d+)\s*:\s*(.+?)$/m);
        if (!hd) continue;

        const taskNum = hd[1];
        const title = hd[2].trim();
        const id = `task-${taskNum}`;

        // Prefer metadata-stored values over heuristic parsing
        const meta = entryMeta.get(id);
        const heuristicStatus = this.determineTaskStatus(
          block,
          taskNum,
          completedContent,
          activeContent,
        );

        const entry: SyncPlanEntry = {
          id,
          description: meta?.description ?? title,
          status: (meta?.status as SyncPlanEntry["status"]) ?? heuristicStatus,
          timestamp: Date.now(),
          version: meta?.version ? parseInt(meta.version, 10) : 1,
        };

        entries.set(id, entry);
      }
    }

    return state;
  }

  /**
   * Split markdown into sections keyed by heading (e.g. `## Tasks`).
   * Returns a Map<heading, content>.
   */
  private splitIntoSections(content: string): Map<string, string> {
    const sections = new Map<string, string>();

    // Split on lines that start with `## ` (level-2 headings)
    const parts = content.split(/\n(?=## )/);

    for (const part of parts) {
      const hd = part.match(/^(## [^\n]+)/);
      if (!hd) continue;
      const heading = hd[1].trim();
      const body = part.slice(hd[1].length).trim();
      sections.set(heading, body);
    }

    return sections;
  }

  /**
   * Split the content of `## Tasks` into individual task blocks,
   * each starting with `### Task N:`.
   */
  private splitTaskBlocks(tasksContent: string): string[] {
    // Split on lines starting with `### `
    const parts = tasksContent.split(/\n(?=### )/);
    return parts.filter((p) => /^###\s+Task\s+\d+\s*:/m.test(p));
  }

  /**
   * Determine the status of a task based on:
   * - Completed section listing
   * - Active Task section
   * - Success criteria checkboxes within the task block
   * - Blocked/cancelled keywords
   */
  private determineTaskStatus(
    taskBlock: string,
    taskNum: string,
    completedContent: string | null,
    activeContent: string | null,
  ): SyncPlanEntry["status"] {
    // Check Completed section
    if (completedContent) {
      const re = new RegExp(`Task\\s+${taskNum}\\s*:`, "i");
      if (re.test(completedContent)) return "completed";
    }

    // Check Active Task section
    if (activeContent) {
      const re = new RegExp(`Task\\s+${taskNum}\\s*:`, "i");
      if (re.test(activeContent)) return "in_progress";
    }

    // Check success-criteria checkboxes
    const checkboxes: string[] = [];
    const cbRe = /^\s*-\s*\[([ xX])\]\s*/gm;
    let m: RegExpExecArray | null;
    while ((m = cbRe.exec(taskBlock)) !== null) {
      checkboxes.push(m[1].toLowerCase());
    }

    if (checkboxes.length > 0) {
      const allChecked = checkboxes.every((c) => c === "x");
      const anyChecked = checkboxes.some((c) => c === "x");
      if (allChecked) return "completed";
      if (anyChecked) return "in_progress";
      return "pending";
    }

    // Heuristic keywords
    if (/blocked/i.test(taskBlock) && !/unblocked/i.test(taskBlock)) return "blocked";
    if (/cancelled|canceled/i.test(taskBlock)) return "cancelled";

    return "pending";
  }

  // -----------------------------------------------------------------------
  // Internals — serialization
  // -----------------------------------------------------------------------

  /**
   * Serialize sync state back into plan file content.
   *
   * Replaces / inserts metadata lines (Sync-Version, Last-Writer, etc.)
   * into the header block (before first `##` heading).
   * Preserves all other content as-is.
   */
  private serializePlanContent(existing: string, state: PlanSyncState): string {
    const normalized = normalizeEol(existing);

    // ---- 1. Build the set of version metadata lines ----
    const metaToWrite = new Map<string, string>();
    metaToWrite.set("Sync-Version", String(state.version));
    metaToWrite.set("Last-Writer", state.lastWriter);
    metaToWrite.set("Last-Write-Time", String(state.lastWriteTime));

    for (const [, entry] of state.entries) {
      metaToWrite.set(`entry-${entry.id}-version`, String(entry.version));
      metaToWrite.set(`entry-${entry.id}-description`, entry.description);
      metaToWrite.set(`entry-${entry.id}-status`, entry.status);
    }

    // ---- 2. Find the metadata region (before first ## heading) ----
    const metaEnd = normalized.search(/\n## /);
    const header = metaEnd >= 0 ? normalized.slice(0, metaEnd) : normalized;
    const rest = metaEnd >= 0 ? normalized.slice(metaEnd) : "";

    // ---- 3. Rebuild the header with updated metadata ----
    const headerLines = header.split("\n");
    const seen = new Set<string>();
    const rebuiltHeader: string[] = [];

    for (const line of headerLines) {
      const kv = line.match(/^(Sync-Version|Last-Writer|Last-Write-Time|entry-[\w-]+-(?:version|description|status)):/i);
      if (kv) {
        const key = this.normalizeMetaKey(kv[1]);
        const val = metaToWrite.get(key);
        if (val !== undefined) {
          rebuiltHeader.push(`${key}: ${val}`);
          seen.add(key);
        }
        // else: stale metadata line (entry no longer in state) — silently drop
      } else {
        rebuiltHeader.push(line);
      }
    }

    // Append any metadata keys that weren't in the original header
    for (const [key, val] of metaToWrite) {
      if (!seen.has(key)) {
        rebuiltHeader.push(`${key}: ${val}`);
      }
    }

    return [...rebuiltHeader, rest].join("\n");
  }

  /**
   * Normalize a metadata key to its canonical form.
   * Handles case-insensitive matching from the regex above.
   */
  private normalizeMetaKey(key: string): string {
    const lower = key.toLowerCase();
    if (lower === "sync-version") return "Sync-Version";
    if (lower === "last-writer") return "Last-Writer";
    if (lower === "last-write-time") return "Last-Write-Time";
    // entry-*-version — preserve as-is from the map (already canonical)
    return key;
  }

  // -----------------------------------------------------------------------
  // Internals — atomic write
  // -----------------------------------------------------------------------

  /**
   * Atomic file write: write to a temp file in the same directory, then rename.
   * On Windows, delete the target first before renaming for reliable atomicity.
   */
  private async atomicWrite(filePath: string, content: string): Promise<void> {
    const dir = path.dirname(filePath);
    const base = path.basename(filePath);
    // Unique suffix per write to avoid temp-file races between concurrent writers
    const suffix = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    const tmpPath = path.join(dir, `.${base}.${suffix}.tmp`);

    await fs.promises.writeFile(tmpPath, content, "utf8");

    // Strategy:
    // 1. Try rename (atomic on most platforms when dest doesn't exist;
    //    on Windows rename overwrites, but can EPERM under concurrent load)
    // 2. Fallback: copyFile + unlink (more reliable on Windows)
    try {
      await fs.promises.rename(tmpPath, filePath);
    } catch {
      // copyFile with COPYFILE_FICLONE is a good fallback
      await fs.promises.copyFile(tmpPath, filePath);
      await fs.promises.unlink(tmpPath).catch(() => {});
    }
  }
}
