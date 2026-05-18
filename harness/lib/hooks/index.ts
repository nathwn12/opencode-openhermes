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
export { dynamicRouteHook } from "./builtins/dynamic-route-hook.ts";
export { nextRouteHook } from "./builtins/next-route-hook.ts";
export { routeTrackingHook, resetRouteTracker, getHopHistory } from "./builtins/route-tracking-hook.ts";
export type { HopRecord, RouteTrackingConfig } from "./builtins/route-tracking-hook.ts";

// Guard configuration
export type { GuardConfig, GuardProgression, GuardLevel } from "../guards/guard-config.ts";
export { DEFAULT_GUARD_CONFIG, checkGuardProgression, mergeGuardConfig } from "../guards/guard-config.ts";


