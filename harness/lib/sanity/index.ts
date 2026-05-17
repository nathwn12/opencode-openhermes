// ---------------------------------------------------------------------------
// Sanity Checker module — barrel export
// ---------------------------------------------------------------------------

export type {
  Severity,
  SanityResult,
  AnomalyRecord,
  AnomalyTrackerConfig,
} from "./interfaces.ts";

export { checkOutputSanity } from "./checker.ts";
export { AnomalyTracker } from "./anomaly-tracker.ts";
