// ---------------------------------------------------------------------------
// Test builders — factory functions with counter-based unique IDs
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Plan {
  id: string
  title: string
  status: "active" | "completed" | "abandoned"
  tasks: Task[]
  created: Date
  updated: Date
}

export interface Task {
  id: string
  description: string
  status: "pending" | "in-progress" | "completed"
  dependsOn: string[]
}

export interface MemoryEntry {
  id: string
  level: "info" | "warning" | "error"
  content: string
  timestamp: Date
  importance: number
  metadata: Record<string, unknown>
}

export interface HookMetadata {
  name: string
  priority: number
  phase: "before" | "after" | "around"
  dependencies: string[]
}

export interface RecoveryRecord {
  context: string
  action: string
  timestamp: Date
}

export interface SyncState {
  entries: Record<string, unknown>
  version: number
  lastWriter: string
}

// ---------------------------------------------------------------------------
// Counter — reset between tests for isolation
// ---------------------------------------------------------------------------

let _counter = 0

/** Reset the ID counter — call in test setup or `beforeEach` for isolation. */
export function resetBuilders(): void {
  _counter = 0
}

// ---------------------------------------------------------------------------
// ID generation
// ---------------------------------------------------------------------------

function nextId(prefix: string): string {
  return `${prefix}_${++_counter}_${Date.now()}`
}

// ---------------------------------------------------------------------------
// Factory functions
// ---------------------------------------------------------------------------

export function createPlan(overrides?: Partial<Plan>): Plan {
  const now = new Date()
  return {
    id: nextId("plan"),
    title: "Test Plan",
    status: "active",
    tasks: [],
    created: now,
    updated: now,
    ...overrides,
  }
}

export function createTask(overrides?: Partial<Task>): Task {
  return {
    id: nextId("task"),
    description: "Test task",
    status: "pending",
    dependsOn: [],
    ...overrides,
  }
}

export function createMemoryEntry(overrides?: Partial<MemoryEntry>): MemoryEntry {
  return {
    id: nextId("mem"),
    level: "info",
    content: "Test memory entry",
    timestamp: new Date(),
    importance: 0.5,
    metadata: {},
    ...overrides,
  }
}

export function createHookMetadata(overrides?: Partial<HookMetadata>): HookMetadata {
  return {
    name: `hook_${nextId("h")}`,
    priority: 0,
    phase: "before",
    dependencies: [],
    ...overrides,
  }
}

export function createRecoveryRecord(overrides?: Partial<RecoveryRecord>): RecoveryRecord {
  return {
    context: "test context",
    action: "recover",
    timestamp: new Date(),
    ...overrides,
  }
}

export function createSyncState(overrides?: Partial<SyncState>): SyncState {
  return {
    entries: {},
    version: 1,
    lastWriter: "test-writer",
    ...overrides,
  }
}
