// MVCC-Style Plan Synchronization — type definitions for concurrent-safe plan file access.

export interface SyncPlanEntry {
  id: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'blocked' | 'cancelled';
  agent?: string;
  timestamp: number;
  version: number;
}

export interface PlanSyncState {
  entries: Map<string, SyncPlanEntry>;
  version: number;       // global version counter
  lastWriter: string;    // agent/session that last wrote
  lastWriteTime: number;
}

export interface SyncConflict {
  entryId: string;
  localVersion: number;
  remoteVersion: number;
  localStatus: string;
  remoteStatus: string;
}

export type ConflictStrategy = 'last-writer-wins' | 'manual';
