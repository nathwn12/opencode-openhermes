// ---------------------------------------------------------------------------
// Hook System — barrel export
// ---------------------------------------------------------------------------

export {
  HookPhase,
  HookResult,
} from "./types.ts";
export type {
  HookContextBase,
  HookContextExtras,
  HookContext,
  HookContextPatch,
  HookMetadata,
  PreToolUseHook,
  PostToolUseHook,
  RouteHook,
  SessionHook,
  AnyHook,
} from "./types.ts";

export { HookRegistry } from "./registry.ts";

// Built-in hooks
export { planCheckHook } from "./builtins/plan-check-hook.ts";
export { shellDetectHook } from "./builtins/shell-detect-hook.ts";
export { confidenceGateHook } from "./builtins/confidence-gate-hook.ts";
export { delegationDepthHook, resetDepthTracker } from "./builtins/delegation-depth-hook.ts";
export { errorRecoveryHook } from "./builtins/error-recovery-hook.ts";
export { memorySyncHook } from "./builtins/memory-sync-hook.ts";
export { sanityCheckHook } from "./builtins/sanity-check-hook.ts";
export { routeTrackingHook, resetRouteTracker, getHopHistory } from "./builtins/route-tracking-hook.ts";
export type { HopRecord, RouteTrackingConfig } from "./builtins/route-tracking-hook.ts";
