// MVCC-Style Plan Synchronization — barrel export.

export type {
  PlanEntry,
  PlanSyncState,
  SyncConflict,
  ConflictStrategy,
} from "./interfaces.ts";

export { PlanSync } from "./plan-sync.ts";
export { PlanFileWatcher } from "./file-watcher.ts";
