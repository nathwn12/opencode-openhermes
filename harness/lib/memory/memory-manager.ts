// ---------------------------------------------------------------------------
// MemoryManager — singleton 4-tier hierarchical memory store
// ---------------------------------------------------------------------------

import { randomUUID } from "node:crypto";
import {
  MemoryLevel,
  DEFAULT_BUDGETS,
} from "./interfaces.ts";
import type {
  MemoryEntry,
  MemorySnapshot,
  MemoryConfig,
} from "./interfaces.ts";

// ---------------------------------------------------------------------------
// Manager
// ---------------------------------------------------------------------------

export class MemoryManager {
  private static instance: MemoryManager | null = null;

  private entries: Map<MemoryLevel, MemoryEntry[]> = new Map();
  private config: MemoryConfig;

  private constructor(config?: Partial<MemoryConfig>) {
    this.config = {
      budgets: { ...DEFAULT_BUDGETS, ...config?.budgets },
    };
    // Initialise every level so callers never hit undefined
    for (const level of Object.values(MemoryLevel)) {
      this.entries.set(level, []);
    }
  }

  // -----------------------------------------------------------------------
  // Singleton
  // -----------------------------------------------------------------------

  static getInstance(config?: Partial<MemoryConfig>): MemoryManager {
    if (!MemoryManager.instance) {
      MemoryManager.instance = new MemoryManager(config);
    }
    return MemoryManager.instance;
  }

  /** Reset singleton — used in tests for isolation. */
  static resetInstance(): void {
    MemoryManager.instance = null;
  }

  // -----------------------------------------------------------------------
  // Public API
  // -----------------------------------------------------------------------

  /**
   * Add a memory entry at the given level.
   * Inserts, sorts by importance DESC then timestamp DESC, then prunes.
   */
  add(
    level: MemoryLevel,
    content: string,
    importance: number,
    metadata?: Record<string, string>,
  ): MemoryEntry {
    const entry: MemoryEntry = {
      id: randomUUID(),
      level,
      content,
      timestamp: Date.now(),
      importance: Math.max(0, Math.min(1, importance)), // clamp [0, 1]
      metadata,
    };

    const bucket = this.entries.get(level)!;
    bucket.push(entry);

    // Sort: importance DESC, then timestamp DESC (newer first for ties)
    bucket.sort((a, b) => {
      if (b.importance !== a.importance) return b.importance - a.importance;
      return b.timestamp - a.timestamp;
    });

    this.prune(level);
    return entry;
  }

  /**
   * Return a formatted context string for all levels.
   * If a query string is provided, only entries whose content includes
   * the query (case-insensitive) are returned.
   */
  getContext(query?: string): string {
    const parts: string[] = [];

    for (const level of Object.values(MemoryLevel)) {
      const bucket = this.entries.get(level) ?? [];
      let filtered = bucket;

      if (query && query.length > 0) {
        const q = query.toLowerCase();
        filtered = bucket.filter((e) => e.content.toLowerCase().includes(q));
      }

      if (filtered.length === 0) continue;

      const heading = level.toUpperCase();
      const lines = filtered.map((e) => {
        const imp = e.importance.toFixed(2);
        const meta = e.metadata ? ` [${formatMetadata(e.metadata)}]` : "";
        return `  [${imp}] ${e.content}${meta}`;
      });

      parts.push(`== ${heading} ==\n${lines.join("\n")}`);
    }

    return parts.join("\n\n");
  }

  /**
   * Remove the least important entries from a level when budget is exceeded.
   * Falls back to DEFAULT_BUDGETS if no explicit budget is configured.
   */
  prune(level: MemoryLevel): void {
    const budget = this.config.budgets[level] ?? DEFAULT_BUDGETS[level];

    // Guard: budget must be a valid non-negative number
    if (typeof budget !== "number" || budget < 0 || !Number.isFinite(budget)) {
      console.warn(
        `[MemoryManager] Invalid budget for level "${level}": ${budget}. Skipping prune.`,
      );
      return;
    }

    const bucket = this.entries.get(level);
    if (!bucket) return;
    if (bucket.length <= budget) return;

    // Already sorted: importance DESC → drop from the end
    bucket.splice(budget);
  }

  /** Clear all entries at a given level (used for TASK after iteration). */
  clearLevel(level: MemoryLevel): void {
    this.entries.set(level, []);
  }

  /** Serialise all entries into a snapshot. */
  export(): MemorySnapshot {
    return {
      system: [...(this.entries.get(MemoryLevel.SYSTEM) ?? [])],
      project: [...(this.entries.get(MemoryLevel.PROJECT) ?? [])],
      mission: [...(this.entries.get(MemoryLevel.MISSION) ?? [])],
      task: [...(this.entries.get(MemoryLevel.TASK) ?? [])],
    };
  }

  /** Restore state from a snapshot. */
  import(snapshot: MemorySnapshot): void {
    this.entries.set(MemoryLevel.SYSTEM, [...snapshot.system]);
    this.entries.set(MemoryLevel.PROJECT, [...snapshot.project]);
    this.entries.set(MemoryLevel.MISSION, [...snapshot.mission]);
    this.entries.set(MemoryLevel.TASK, [...snapshot.task]);
  }

  /** Get entries, optionally filtered by level. */
  getEntries(level?: MemoryLevel): MemoryEntry[] {
    if (level) {
      return [...(this.entries.get(level) ?? [])];
    }
    const all: MemoryEntry[] = [];
    for (const lvl of Object.values(MemoryLevel)) {
      all.push(...(this.entries.get(lvl) ?? []));
    }
    return all;
  }

  /** Count entries at a given level. */
  getEntryCount(level: MemoryLevel): number {
    return this.entries.get(level)?.length ?? 0;
  }

  /** Update the budgets after construction. */
  setBudgets(budgets: Partial<Record<MemoryLevel, number>>): void {
    for (const [level, budget] of Object.entries(budgets)) {
      if (budget !== undefined && Object.values(MemoryLevel).includes(level as MemoryLevel)) {
        this.config.budgets[level as MemoryLevel] = budget;
      }
    }
    // Re-prune all levels with new budgets
    for (const level of Object.values(MemoryLevel)) {
      this.prune(level);
    }
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatMetadata(meta: Record<string, string>): string {
  return Object.entries(meta)
    .map(([k, v]) => `${k}=${v}`)
    .join(", ");
}
