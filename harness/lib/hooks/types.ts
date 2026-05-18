// ---------------------------------------------------------------------------
// Hook System — type definitions
// ---------------------------------------------------------------------------

export enum HookPhase {
  EARLY = 0,
  NORMAL = 1,
  LATE = 2,
}

export interface HookContextBase {
  sessionId: string;
  agent: string;
  directory: string;
  sessions: Map<string, unknown>;
}

export interface HookContextExtras {
  _planCheck?: "missing" | "found";
  _planFilePath?: string;
  _planCheckInstruction?: string;

  _shellPlatform?: string;
  _shellType?: string;
  _shellPreamble?: string;

  _delegationDepth?: number;
  _depthExceeded?: boolean;
  _depthError?: string;

  _confidenceLevel?: "HIGH" | "MEDIUM" | "LOW" | string;
  _confidenceExchanges?: number;

  // Guard configuration (centralized — replaces _routeTrackingConfig and _maxDelegationDepth)
  _guardConfig?: import("../guards/guard-config.ts").GuardConfig;
  _guardProgression?: import("../guards/guard-config.ts").GuardProgression;

  // Subagent failure tracking
  _subagentFailures?: number;
  _subagentFailureThreshold?: number;
  _optiRoute?: {
    reason: string;
    chain: Array<{
      skill: string;
      timestamp: number;
      producedArtifact: boolean;
    }>;
    skillCounts: Record<string, number>;
    unproductiveCount: number;
    maxSkillRepeats: number;
    maxUnproductiveHops: number;
  };

  _routingSkillsDir?: string;
  _nextRoute?: import("../routing/index.ts").RuntimeRouteDecision;

  [key: string]: unknown;
}

export type HookContext = HookContextBase & HookContextExtras;

export type HookContextPatch = Partial<HookContextBase> &
  Partial<HookContextExtras>;

export interface HookMetadata {
  name: string;
  priority: number;       // 0-100, higher = earlier within phase
  phase: HookPhase;
  dependencies: string[]; // hook names this depends on
  errorHandling: "propagate" | "isolate" | "retry";
}

export enum HookResult {
  CONTINUE = "continue",
  STOP = "stop",
  INJECT = "inject",
}

export interface PreToolUseHook {
  metadata: HookMetadata;
  execute(
    context: HookContext,
  ): Promise<{ result: HookResult; modifiedContext?: HookContextPatch }>;
}

export interface PostToolUseHook {
  metadata: HookMetadata;
  execute(
    context: HookContext,
    output: string,
  ): Promise<{
    result: HookResult;
    modifiedOutput?: string;
  }>;
}

export interface RouteHook {
  metadata: HookMetadata;
  execute(
    context: HookContext,
    route: string,
  ): Promise<{ result: HookResult; modifiedRoute?: string }>;
}

export interface SessionHook {
  metadata: HookMetadata;
  onSessionStart(context: HookContext): Promise<void>;
  onSessionEnd(context: HookContext): Promise<void>;
}

// Union type for any hook in the registry
export type AnyHook =
  | PreToolUseHook
  | PostToolUseHook
  | RouteHook
  | SessionHook;
