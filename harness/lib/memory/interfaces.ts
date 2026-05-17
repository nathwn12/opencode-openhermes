// ---------------------------------------------------------------------------
// 4-Tier Memory System — interfaces & types
// ---------------------------------------------------------------------------

export enum MemoryLevel {
  SYSTEM = "system",    // immutable OpenHermes identity, never pruned
  PROJECT = "project",  // project-level config, conventions, decisions
  MISSION = "mission",  // current session goal, active plan reference
  TASK = "task",        // per-step findings, cleared after each iteration
}

export interface MemoryEntry {
  id: string;
  level: MemoryLevel;
  content: string;
  timestamp: number;
  importance: number;  // 0.0 to 1.0
  metadata?: Record<string, string>;
}

export interface MemorySnapshot {
  system: MemoryEntry[];
  project: MemoryEntry[];
  mission: MemoryEntry[];
  task: MemoryEntry[];
}

export interface MemoryConfig {
  budgets: Partial<Record<MemoryLevel, number>>;  // max entries per level, defaults filled for missing
}

export interface Finding {
  id: string;
  sessionId: string;
  description: string;
  severity: "info" | "warning" | "blocker";
  timestamp: number;
}

export interface Decision {
  id: string;
  sessionId: string;
  description: string;
  rationale: string;
  timestamp: number;
}

export const DEFAULT_BUDGETS: Record<MemoryLevel, number> = {
  [MemoryLevel.SYSTEM]: 50,
  [MemoryLevel.PROJECT]: 100,
  [MemoryLevel.MISSION]: 30,
  [MemoryLevel.TASK]: 20,
};
